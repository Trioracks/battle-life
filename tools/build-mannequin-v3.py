"""Metre-scale avatar and interchangeable, genuinely skinned wardrobe.

Blender 4.5, authored geometry only. Every look-* object uses the same armature.
The in-place walk's stance speed is the exported strideDistance per cycle.
"""
import bpy, bmesh, math, os, json
from mathutils import Vector, Matrix

ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT=os.path.join(ROOT,'assets','apartment','v3');os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.render.fps=30
bpy.context.preferences.filepaths.save_version=0
def mat(name,color):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=.82
    return m
skin=mat('warm-skin',(.52,.325,.22));eye=mat('eyes',(.026,.022,.018))
hair=mat('hair-dark-brown',(.075,.041,.025));hair_highlight=mat('hair-ridges',(.098,.056,.034))
stubble=mat('short-beard',(.3865,.2398,.1615));lip=mat('lips',(.30,.13,.09))
beard_brown=mat('full-beard-brown',(.160,.090,.052))
beard_edge=mat('full-beard-soft-edge',(.245,.145,.087))
beard_plane=mat('full-beard-warm-planes',(.195,.111,.062))
tee=mat('tee-slate',(.12,.22,.25));shirt=mat('shirt-ivory',(.67,.61,.48))
hoodie=mat('hoodie-rust',(.34,.12,.065));sweater=mat('sweater-moss',(.20,.24,.13))
denim=mat('denim',(.075,.13,.19));twill=mat('breeches-twill',(.33,.28,.20))
denim_pocket=mat('denim-pocket',(.088,.15,.215));eye_white=mat('eye-ivory',(.82,.79,.66))
shorts_mat=mat('shorts-canvas',(.22,.25,.23));sports=mat('sports-charcoal',(.085,.10,.11))
sole=mat('rubber-soles',(.12,.135,.13));shoe=mat('sneaker-upper',(.48,.49,.43))
leather=mat('brown-leather',(.17,.092,.052));trim=mat('clothing-trim',(.48,.46,.37))
meshes=[]
def weight(obj,bone):
    vg=obj.vertex_groups.new(name=bone);vg.add(list(range(len(obj.data.vertices))),1,'REPLACE');meshes.append(obj)
def ellipsoid(name,loc,scale,material,bone):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=12,radius=1,location=loc)
    o=bpy.context.object;o.name=name;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(material)
    for p in o.data.polygons:p.use_smooth=True
    weight(o,bone);return o

def capsule(name,a,b,radii,material,bone):
    a,b=Vector(a),Vector(b);o=ellipsoid(name,(a+b)/2,(radii[0],radii[1],(b-a).length/2),material,bone)
    o.rotation_mode='QUATERNION';o.rotation_quaternion=Vector((0,0,1)).rotation_difference(b-a)
    return o

def finish_group(name,start):
    # Consolidate a selectable item, retaining its material slots and weights.
    group=meshes[start:];bpy.ops.object.select_all(action='DESELECT')
    for o in group:o.select_set(True)
    bpy.context.view_layer.objects.active=group[0]
    if len(group)>1:bpy.ops.object.join()
    o=bpy.context.object;o.name=name;bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    meshes[start:]=[o];return o

def surface(name,vertices,faces,material,weights,smooth=False,thickness=0):
    me=bpy.data.meshes.new(name);me.from_pydata(vertices,[],faces);me.update()
    bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free()
    o=bpy.data.objects.new(name,me);scene.collection.objects.link(o);o.data.materials.append(material)
    for i,w in enumerate(weights):
        for bone,amount in w.items():
            vg=o.vertex_groups.get(bone) or o.vertex_groups.new(name=bone);vg.add([i],amount,'REPLACE')
    for p in me.polygons:p.use_smooth=smooth
    meshes.append(o)
    if thickness:
        bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
        mod=o.modifiers.new('sewn-fabric-thickness','SOLIDIFY');mod.thickness=thickness;mod.offset=-1
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return o
def rings(name,rows,material,cap=True,neckline=False):
    # Rows: centre, elliptical radii, bone weights. Smooth blended joint rings.
    vertices=[];faces=[];n=16
    for center,rx,ry,weights in rows:
        for j in range(n):
            a=2*math.pi*j/n
            z=center[2]-(.020*max(0,-math.sin(a)) if neckline and center==rows[-1][0] else 0)
            vertices.append((center[0]+rx*math.cos(a),center[1]+ry*math.sin(a),z))
    for i in range(len(rows)-1):
        for j in range(n):faces.append((i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j))
    if cap:faces.extend([tuple(reversed(range(n))),tuple((len(rows)-1)*n+j for j in range(n))])
    # Torso profiles ascend, but limbs descend. Both need outward normals.
    if rows[-1][0][2]<rows[0][0][2]:faces=[tuple(reversed(f)) for f in faces]
    me=bpy.data.meshes.new(name);me.from_pydata(vertices,[],faces);me.update();o=bpy.data.objects.new(name,me);scene.collection.objects.link(o);o.data.materials.append(material)
    for i,row in enumerate(rows):
        for bone,w in row[3].items():
            vg=o.vertex_groups.get(bone) or o.vertex_groups.new(name=bone);vg.add(list(range(i*n,(i+1)*n)),w,'REPLACE')
    for p in me.polygons:p.use_smooth=True
    meshes.append(o);return o

bpy.ops.object.armature_add();rig=bpy.context.object;rig.name='mannequin-rig';bpy.ops.object.mode_set(mode='EDIT');rig.data.edit_bones.remove(rig.data.edit_bones[0])
rest={}
def bone(name,h,t,parent=None):
    b=rig.data.edit_bones.new(name);b.head=h;b.tail=t
    if parent:b.parent=rig.data.edit_bones[parent]
    rest[name]=(Vector(h),Vector(t));return b
bone('pelvis',(0,0,.91),(0,0,1.02))
bone('spine',(0,0,1.02),(0,0,1.23),'pelvis')
bone('chest',(0,0,1.23),(0,0,1.43),'spine')
bone('neck',(0,0,1.43),(0,0,1.54),'chest')
bone('head',(0,0,1.54),(0,0,1.78),'neck')
for side,s in [('L',1),('R',-1)]:
    bone('upper_arm.'+side,(s*.225,0,1.405),(s*.245,0,1.13),'chest')
    bone('forearm.'+side,(s*.245,0,1.13),(s*.25,-.01,.895),'upper_arm.'+side)
    bone('hand.'+side,(s*.25,-.01,.895),(s*.25,-.015,.785),'forearm.'+side)
    bone('thigh.'+side,(s*.112,0,.91),(s*.112,0,.505),'pelvis')
    bone('shin.'+side,(s*.112,0,.505),(s*.112,0,.095),'thigh.'+side)
    bone('foot.'+side,(s*.112,0,.095),(s*.112,-.145,.055),'shin.'+side)
    bone('toe.'+side,(s*.112,-.145,.055),(s*.112,-.205,.045),'foot.'+side)
bpy.ops.object.mode_set(mode='OBJECT')

rings('skin-torso',[
 ((0,0,.875),.125,.083,{'pelvis':1}),((0,0,.94),.16,.10,{'pelvis':1}),
 ((0,0,1.05),.160,.096,{'pelvis':.3,'spine':.7}),((0,0,1.20),.167,.101,{'spine':.4,'chest':.6}),
 ((0,0,1.34),.184,.108,{'chest':1}),((0,0,1.40),.176,.100,{'chest':1}),
 ((0,0,1.46),.063,.058,{'chest':.3,'neck':.7})],skin)
ellipsoid('skin-neck',(0,0,1.49),(.052,.050,.081),skin,'neck')
for side,s in [('L',1),('R',-1)]:
    upper='upper_arm.'+side;lower='forearm.'+side;hand='hand.'+side;thigh='thigh.'+side;shin='shin.'+side
    rings('skin-arm-'+side,[((s*.190,0,1.400),.045,.051,{'chest':.5,upper:.5}),((s*.232,0,1.366),.056,.057,{upper:1}),((s*.241,0,1.25),.045,.044,{upper:1}),((s*.245,0,1.15),.037,.036,{upper:.8,lower:.2}),((s*.246,0,1.11),.035,.036,{upper:.2,lower:.8}),((s*.248,-.003,1.03),.042,.037,{lower:1}),((s*.25,-.01,.90),.027,.025,{lower:.8,hand:.2})],skin)
    ellipsoid('skin-hand-'+side,(s*.25,-.015,.851),(.035,.027,.059),skin,hand)
    # All selectable bottoms cover the upper thighs. Omit that hidden skin so
    # moving fabric cannot reveal redundant hip triangles through the waist.
    # A 2 cm overlap above the shortest hem keeps the bare lower legs seamless.
    rings('skin-leg-'+side,[((s*.112,0,.66),.062,.061,{thigh:1}),((s*.112,0,.62),.058,.057,{thigh:1}),((s*.112,0,.525),.048,.046,{thigh:.8,shin:.2}),((s*.112,0,.488),.046,.046,{thigh:.2,shin:.8}),((s*.112,.005,.39),.058,.058,{shin:1}),((s*.112,0,.20),.036,.037,{shin:1}),((s*.112,0,.095),.030,.034,{shin:1})],skin)
    ellipsoid('skin-foot-'+side,(s*.112,-.064,.063),(.050,.128,.042),skin,'foot.'+side)
finish_group('neutral-skinned-body',0)

# A single selectable head includes its features, so face changes never stack.
lower_face=[(1.498,.051,.058),(1.531,.082,.077),(1.582,.107,.094),(1.630,.122,.104),(1.657,.126,.109)]
face_profiles={
 'oval':lower_face+[(1.715,.127,.111),(1.772,.111,.096),(1.812,.067,.060),(1.827,.020,.022)],
 'square':[(1.498,.080,.066),(1.531,.110,.084),(1.582,.119,.099),(1.630,.128,.108),(1.657,.130,.112)]+[(1.715,.137,.114),(1.779,.130,.098),(1.814,.079,.064),(1.827,.023,.025)],
 'long':[(1.474,.043,.056),(1.517,.068,.078),(1.575,.093,.099),(1.630,.111,.106),(1.657,.115,.109)]+[(1.718,.114,.109),(1.780,.101,.095),(1.827,.059,.057),(1.842,.018,.020)]}
def face_point(z,rx,ry,j,offset=0):
    a=2*math.pi*j/16
    # Broader frontal planes and angular cheeks, deliberately faceted.
    x=math.copysign(abs(math.cos(a))**.78,math.cos(a))*(rx+offset)
    y=-.012+math.copysign(abs(math.sin(a))**.78,math.sin(a))*(ry+offset)
    return (x,y,z)
for kind,profile in face_profiles.items():
    start=len(meshes);prefix='look-face-'+kind
    vertices=[face_point(z,rx,ry,j) for z,rx,ry in profile for j in range(16)]
    faces=[(i*16+j,i*16+(j+1)%16,(i+1)*16+(j+1)%16,(i+1)*16+j) for i in range(len(profile)-1) for j in range(16)]
    faces.extend([tuple(reversed(range(16))),tuple((len(profile)-1)*16+j for j in range(16))])
    surface(prefix+'-head',vertices,faces,skin,[{'head':1}]*len(vertices))
    nose=[(-.020,-.119,1.699),(.020,-.119,1.699),(-.025,-.126,1.645),(.025,-.126,1.645),(0,-.177,1.651),(0,-.145,1.704),(0,-.142,1.637)]
    nose=[(x*(1.28 if kind=='square' else .78 if kind=='long' else 1),y-(.012 if kind=='long' else 0),z-(.006 if kind=='long' else 0)) for x,y,z in nose]
    surface(prefix+'-nose',nose,[(0,1,5),(0,5,4,2),(5,1,3,4),(2,4,6),(4,3,6),(0,2,6,3,1)],skin,[{'head':1}]*7)
    surface(prefix+'-mouth',[(-.033,-.116,1.606),(0,-.122,1.604),(.033,-.116,1.606),(0,-.120,1.596)],[(0,1,3),(1,2,3)],lip,[{'head':1}]*4)
    for s in [-1,1]:
        width=.119 if kind=='long' else .133
        ellipsoid(prefix+'-ear',(s*width,.003,1.660),(.021,.027,.038),skin,'head')
        ellipsoid(prefix+'-eye-white',(s*.046,-.122,1.706),(.011,.004,.008),eye_white,'head')
        ellipsoid(prefix+'-eye',(s*.046,-.127,1.706),(.008,.0035,.008),eye,'head')
        surface(prefix+'-brow',[(s*.026,-.127,1.731),(s*.070,-.116,1.727),(s*.071,-.117,1.734),(s*.029,-.128,1.739)],[(0,1,2,3)],hair,[{'head':1}]*4)
    finish_group(prefix,start)

def hair_cap(name,style):
    verts=[];faces=[];segments=16;rows=10
    def envelope(z):
        sizes=[]
        for profile in face_profiles.values():
            extended=profile+[(1.855,.001,.001)]
            for (a,ax,ay),(b,bx,by) in zip(extended,extended[1:]):
                if a<=z<=b:
                    t=(z-a)/(b-a);sizes.append((ax+(bx-ax)*t,ay+(by-ay)*t));break
        return max(v[0] for v in sizes),max(v[1] for v in sizes)
    for i in range(rows+1):
        for j in range(segments):
            a=2*math.pi*j/segments;front=max(0,-math.sin(a))
            end=1.70-.70*front
            if style=='shaggy':end+=.17+.07*math.sin(a*7)
            polar=.015+(end-.015)*i/rows
            z=1.668+.185*math.cos(polar)
            rx,ry=envelope(z)
            extra=.010 if style!='shaggy' else .016
            if style=='parted':z+=.021*max(0,-math.cos(a))*math.sin(polar)
            verts.append(((rx+extra)*math.copysign(abs(math.cos(a))**.78,math.cos(a)),-.012+(ry+extra)*math.copysign(abs(math.sin(a))**.78,math.sin(a)),z))
    for i in range(rows):
        for j in range(segments):faces.append((i*segments+j,(i+1)*segments+j,(i+1)*segments+(j+1)%segments,i*segments+(j+1)%segments))
    faces.append(tuple(range(segments)))
    me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new(name,me);scene.collection.objects.link(o)
    o.data.materials.append(hair)
    for p in me.polygons:p.use_smooth=False
    weight(o,'head')

for kind in ['crop','parted','shaggy']:
    start=len(meshes);prefix='look-hair-'+kind;hair_cap(prefix+'-cap',kind)
    if kind=='parted':
        for i in range(5):
            x=-.068+i*.025
            o=ellipsoid(prefix+'-swept-lock',(x,-.037,1.817+(.018 if x<0 else 0)),(.028,.079,.022),hair_highlight,'head');o.rotation_euler[2]=-.20
        capsule(prefix+'-fringe',(-.093,-.113,1.757),(.042,-.119,1.793),(.014,.012),hair,'head')
    elif kind=='shaggy':
        for i in range(7):
            x=-.09+i*.029
            capsule(prefix+'-fringe',(x,-.091,1.811),(x+.009,-.128,1.722+(i%3)*.008),(.020,.016),hair_highlight,'head')
        for s in [-1,1]:
            capsule(prefix+'-side',(s*.139,.012,1.75),(s*.135,-.010,1.619),(.021,.034),hair,'head')
    finish_group(prefix,start)

# Facial hair follows the actual shared jaw vertices, with millimetre relief.
# The top edge leaves the lips visible; moustache remains independent.
for kind in ['stubble']:
    start=len(meshes);prefix='look-beard-'+kind;material=stubble if kind=='stubble' else hair
    vertices=[];faces=[]
    for i,(z,rx,ry) in enumerate(lower_face):
        for j in range(8,17):
            v=list(face_point(z,rx,ry,j,.0018 if kind=='stubble' else .008))
            if kind=='full' and i<2:v[2]-=.028*(1-i*.5)
            vertices.append(v)
    for i in range(4):
        for j in range(8):
            if i>=2 and j in [3,4]:continue
            faces.append((i*9+j,i*9+j+1,(i+1)*9+j+1,(i+1)*9+j))
    # Remove unused lip-area vertices, so every exported point is a surface point.
    used=sorted({j for f in faces for j in f});remap={j:i for i,j in enumerate(used)}
    surface(prefix+'-surface',[vertices[j] for j in used],[tuple(remap[j] for j in f) for f in faces],material,[{'head':1}]*len(used))
    finish_group(prefix,start)

# A short sculpted beard: tapered sideburns follow a curved cheek line down
# below the lip, then grow outward over the jaw and tuck under the chin. The
# boundary has millimetre relief, with fuller hair only in the central rows.
start=len(meshes);vertices=[];faces=[];segments=24;rows=7
cheek_line=[(0,1.614),(.08,1.653),(.18,1.632),(.29,1.610),(.40,1.584),(.50,1.579)]
def beard_face_radii(z):
    profile=[(1.471,.034,.045)]+lower_face
    for (a,ax,ay),(b,bx,by) in zip(profile,profile[1:]):
        if a<=z<=b:
            t=(z-a)/(b-a);return ax+(bx-ax)*t,ay+(by-ay)*t
    return lower_face[-1][1:]
for row in range(rows):
    t=row/(rows-1)
    for j in range(segments+1):
        u=j/segments;q=min(u,1-u);a=math.pi-.13+(math.pi+.26)*u
        top=cheek_line[-1][1]
        for (u0,z0),(u1,z1) in zip(cheek_line,cheek_line[1:]):
            if u0<=q<=u1:
                top=z0+(z1-z0)*(q-u0)/(u1-u0);break
        top+=.0014*math.sin(j*2.2)
        bottom=1.491-.017*math.sin(math.pi*u)**2
        z=top*(1-t)+bottom*t
        rx,ry=beard_face_radii(z)
        fullness=(.007+.012*math.sin(math.pi*u)**2)*math.sin(math.pi*t)
        relief=.0017+fullness+.0016*math.sin(j*2.0+.5)*math.sin(math.pi*t)**2
        x=(rx+relief)*math.copysign(abs(math.cos(a))**.78,math.cos(a))
        y=-.012+(ry+relief)*math.copysign(abs(math.sin(a))**.78,math.sin(a))
        vertices.append((x,y,z))
for row in range(rows-1):
    for j in range(segments):faces.append((row*(segments+1)+j,row*(segments+1)+j+1,(row+1)*(segments+1)+j+1,(row+1)*(segments+1)+j))
o=surface('look-beard-full-volume',vertices,faces,beard_brown,[{'head':1}]*len(vertices),smooth=False)
o.data.materials.append(beard_edge);o.data.materials.append(beard_plane)
for polygon in o.data.polygons:
    row=polygon.index//segments;j=polygon.index%segments
    polygon.material_index=1 if row==0 else 2 if (row in [2,3,4] and j%4 in [1,2]) else 0
finish_group('look-beard-full',start)
start=len(meshes)
for s in [-1,1]:
    surface('mustache-panel',[(s*.002,-.140,1.635),(s*.030,-.124,1.628),(s*.036,-.120,1.614),(s*.003,-.130,1.624)],[(0,1,2,3)],hair,[{'head':1}]*4)
finish_group('look-mustache-classic',start)

def torso_garment(prefix,material,loose,kind):
    # Sewn topology: remove two side patches from the torso and extend their
    # boundary loops into sleeves. Shoulder, armhole and cuff share vertices.
    vertices=[];faces=[];weights=[];levels=[];n=16
    rows=[(.945,.186,.117,{'pelvis':1}),
          (1.075,.187,.122,{'pelvis':.3,'spine':.7}),
          (1.245,.194,.128,{'spine':.3,'chest':.7}),
          (1.320,.205,.131,{'chest':1}),
          (1.421,.206,.118,{'chest':1}),
          (1.452,.071,.065,{'chest':.8,'neck':.2})]
    if kind=='tank':rows[-1]=(1.391,.103,.085,{'chest':1})
    def vertex(v,w):vertices.append(v);weights.append(w);return len(vertices)-1
    for level,(z,rx,ry,w) in enumerate(rows):
        loop=[]
        for j in range(n):
            a=2*math.pi*j/n;sn=math.sin(a);cs=math.cos(a)
            x=(rx+(loose if level<5 else 0))*math.copysign(abs(cs)**.72,cs)
            y=(ry+(loose if level<5 else 0))*math.copysign(abs(sn)**.72,sn)
            zz=z-(.018*max(0,-sn) if level==5 else 0)
            garment_weights=w.copy()
            if level in [2,3,4] and j in [15,0,1,7,8,9]:
                arm='upper_arm.'+('L' if x>0 else 'R')
                blend=.12 if level==2 else .36 if level==3 else .25
                garment_weights={bone:amount*(1-blend) for bone,amount in w.items()};garment_weights[arm]=blend
            loop.append(vertex((x,y,zz),garment_weights))
        levels.append(loop)
        if level:
            for j in range(n):
                if level in [3,4] and j in [15,0,7,8]:continue
                faces.append((levels[level-1][j],levels[level-1][(j+1)%n],loop[(j+1)%n],loop[j]))
    for side,s in [('L',1),('R',-1)]:
        up='upper_arm.'+side;lo='forearm.'+side;c=0 if s>0 else 8
        if kind=='tank':continue
        # Start at the shoulder, round the back, through armpit, up the front.
        step=1 if s>0 else -1
        previous=[levels[4][c],levels[4][(c+step)%16],levels[3][(c+step)%16],levels[2][(c+step)%16],levels[2][c],levels[2][(c-step)%16],levels[3][(c-step)%16],levels[4][(c-step)%16]]
        sleeve=[(.253,1.344,.072+loose,.072+loose,{up:1}),(.252,1.254,.066+loose,.065+loose,{up:1})]
        if kind!='tee':
            sleeve.extend([(.247,1.165,.058+loose,.056+loose,{up:.9,lo:.1}),(.247,1.115,.055+loose,.054+loose,{up:.2,lo:.8}),(.249,1.025,.057+loose,.052+loose,{lo:1}),(.25,.933,.040+loose*.5,.039+loose*.5,{lo:1}),(.25,.918,.039+loose*.5,.037+loose*.5,{lo:1})])
        else:sleeve.append((.252,1.244,.067+loose,.066+loose,{up:1}))
        for level,(x,z,rx,ry,w) in enumerate(sleeve):
            current=[]
            for j in range(8):
                a=2*math.pi*j/8
                current.append(vertex((s*(x+rx*math.cos(a)),ry*math.sin(a)-(.008 if z<1.0 else 0),z+(.032*math.cos(a) if level==0 else 0)),w))
            for j in range(8):faces.append((previous[j],previous[(j+1)%8],current[(j+1)%8],current[j]))
            previous=current
    return surface(prefix+'-fabric',vertices,faces,material,weights,smooth=False,thickness=.003)

for kind,material,loose in [('tee',tee,0),('shirt',shirt,.002),('hoodie',hoodie,.012),('sweater',sweater,.006)]:
    start=len(meshes);prefix='look-top-'+kind;torso_garment(prefix,material,loose,kind)
    if kind=='shirt':
        for s in [-1,1]:surface(prefix+'-collar',[(s*.019,-.069,1.444),(s*.068,-.053,1.453),(s*.098,-.110,1.402),(s*.052,-.125,1.380)],[(0,1,2,3)],shirt,[{'chest':1}]*4,thickness=.003)
        surface(prefix+'-placket',[(-.010,-.122,.96),(.010,-.122,.96),(.010,-.134,1.32),(-.010,-.134,1.32)],[(0,1,2,3)],shirt,[{'pelvis':1},{'pelvis':1},{'chest':1},{'chest':1}],thickness=.002)
        for z in [1.05,1.12,1.19,1.26,1.33,1.40]:ellipsoid(prefix+'-button',(0,-(.130 if z<1.21 else .135),z),(.004,.004,.004),leather,'chest' if z>1.2 else 'spine')
    if kind=='hoodie':
        # Folded hood is a rounded shell around the back of the neck.
        rings(prefix+'-hood',[((0,.070,1.348),.119,.095,{'chest':1}),((0,.072,1.445),.121,.095,{'chest':.7,'neck':.3}),((0,.047,1.493),.085,.066,{'neck':1})],hoodie,cap=False)
        surface(prefix+'-pocket',[(-.102,-.140,1.015),(.102,-.140,1.015),(.094,-.144,1.102),(.060,-.145,1.129),(-.060,-.145,1.129),(-.094,-.144,1.102)],[(0,1,2,3,4,5)],hoodie,[{'spine':1}]*6,thickness=.003)
        for s in [-1,1]:capsule(prefix+'-drawstring',(s*.042,-.086,1.426),(s*.044,-.128,1.305),(.003,.003),trim,'chest')
    finish_group(prefix,start)

def pants_surface(name,material,kind):
    # A sewn surface: one waistband divides at a shared front/crotch/back seam.
    # No overlapping waist cylinder, leg caps or detached rear padding.
    vertices=[];faces=[];weights=[];segments=32
    def vertex(v,w):
        vertices.append(v);weights.append(w);return len(vertices)-1
    def bridge(a,b):
        for j in range(len(a)):
            k=(j+1)%len(a);faces.append((a[k],a[j],b[j],b[k]))
    waist=[]
    for z,rx,ry in [(.961,.177,.112),(.916,.188,.117),(.876,.209,.116),(.846,.211,.116)]:
        ring=[]
        for j in range(segments):
            a=2*math.pi*j/segments;x=rx*math.cos(a)
            w={'pelvis':1} if z>.87 else {'pelvis':.65,'thigh.L' if x>=0 else 'thigh.R':.35}
            ring.append(vertex((x,ry*math.sin(a),z),w))
        if waist:bridge(waist[-1],ring)
        waist.append(ring)
    crotch=[vertex((0,.113,.777),{'pelvis':.25,'thigh.L':.375,'thigh.R':.375}),
            vertex((0,0,.765),{'pelvis':.20,'thigh.L':.40,'thigh.R':.40}),
            vertex((0,-.113,.777),{'pelvis':.25,'thigh.L':.375,'thigh.R':.375})]
    extra=.012 if kind=='sports' else .016 if kind=='shorts' else .006
    for side,s in [('L',1),('R',-1)]:
        thigh='thigh.'+side;shin='shin.'+side
        # Outer semicircle has 16 segments; the inner arc joins the crotch seam.
        boundary=[waist[-1][j%32] for j in range(-8,9)] if s>0 else [waist[-1][j%32] for j in range(8,25)]
        boundary+=crotch if s>0 else list(reversed(crotch))
        angles=[-math.pi/2+j*math.pi/16 for j in range(17)]+[math.pi/2+j*math.pi/4 for j in range(1,4)]
        if s<0:angles=[a+math.pi for a in angles]
        rows=[(.757,.087+extra,.102+extra,{thigh:1}),(.705,.081+extra,.086+extra,{thigh:1}),(.64,.074+extra,.074+extra,{thigh:1})]
        if kind=='shorts':rows.append((.627,.075+extra,.075+extra,{thigh:1}))
        if kind!='shorts':rows.extend([(.525,.061+extra,.059+extra,{thigh:.8,shin:.2}),(.488,.059+extra,.058+extra,{thigh:.2,shin:.8}),(.39,.070+extra,.070+extra,{shin:1})])
        if kind=='breeches':rows.append((.34,.057,.059,{shin:1}))
        elif kind in ['jeans','sports']:rows.extend([(.20,.048+extra,.049+extra,{shin:1}),(.105,.043,.046,{shin:1})])
        for z,rx,ry,w in rows:
            ring=[]
            for j,a in enumerate(angles):
                x=s*.112+rx*math.cos(a);y=(.005 if abs(z-.39)<.001 else 0)+ry*math.sin(a)
                if z>.74 and j in [17,19]:
                    # D-shaped upper legs meet a narrow sewn inseam. A circular
                    # inner arc here creates a broad, concave triangular gusset.
                    x=s*(.112-rx*.93);y=s*ry*(.92 if j==17 else -.92)
                ring.append(vertex((x,y,z),w))
            bridge(boundary,ring);boundary=ring
        if kind=='sports':
            for stripe_y in [-.013,.013]:
                rings(name+'-stripe-'+side,[((s*(.112+rx-.001),stripe_y+(.005 if abs(z-.39)<.001 else 0),z),.002,.004,w) for z,rx,ry,w in rows],trim)
    me=bpy.data.meshes.new(name);me.from_pydata(vertices,[],faces);me.update()
    o=bpy.data.objects.new(name,me);scene.collection.objects.link(o);o.data.materials.append(material)
    for i,w in enumerate(weights):
        for bone,amount in w.items():
            vg=o.vertex_groups.get(bone) or o.vertex_groups.new(name=bone);vg.add([i],amount,'REPLACE')
    for p in me.polygons:p.use_smooth=False
    meshes.append(o)

for kind,material in [('jeans',denim),('breeches',twill),('shorts',shorts_mat),('sports',sports)]:
    start=len(meshes);prefix='look-bottom-'+kind
    pants_surface(prefix+'-fabric',material,kind)
    for side,s in [('L',1),('R',-1)]:
        if kind=='jeans':
            # Five-sided pocket lies on the rear hip, with its own same-side weights.
            vertices=[(s*.059,.113,.884),(s*.141,.099,.884),(s*.139,.100,.827),(s*.100,.111,.805),(s*.062,.113,.827)]
            surface(prefix+'-back-pocket-'+side,vertices,[(0,1,2,3,4)],denim_pocket,[{'pelvis':.65,'thigh.'+side:.35}]*5,thickness=.0015)
    finish_group(prefix,start)

SOLE_OUTLINE=[(-.045,.066),(.045,.066),(.060,.023),(.061,-.150),(.043,-.212),(-.043,-.212),(-.061,-.150),(-.060,.023)]
SOLE_PROFILE=[(y*scale,z) for scale,z in [(.98,.004),(1.03,.016),(1,.030)] for x,y in SOLE_OUTLINE]
def shoe_sole(name,x,foot):
    vertices=[];faces=[]
    for scale,z in [(.98,.004),(1.03,.016),(1,.030)]:
        vertices.extend([(x+dx*scale,y*scale,z) for dx,y in SOLE_OUTLINE])
    for row in range(2):
        for j in range(8):faces.append((row*8+j,row*8+(j+1)%8,(row+1)*8+(j+1)%8,(row+1)*8+j))
    faces.extend([tuple(reversed(range(8))),tuple(16+j for j in range(8))])
    surface(name,vertices,faces,sole,[{foot:1}]*len(vertices))
def shoe_upper(name,x,foot,material):
    vertices=[];faces=[]
    for y,w,top in [(.060,.043,.111),(.018,.054,.128),(-.05,.060,.118),(-.15,.058,.100),(-.199,.041,.077),(-.213,.023,.051)]:
        for dx,z in [(-w,.036),(-w,top-.017),(-w*.68,top),(w*.68,top),(w,top-.017),(w,.036),(w*.65,.030),(-w*.65,.030)]:vertices.append((x+dx,y,z))
    for row in range(5):
        for j in range(8):faces.append((row*8+j,row*8+(j+1)%8,(row+1)*8+(j+1)%8,(row+1)*8+j))
    faces.extend([tuple(reversed(range(8))),tuple(40+j for j in range(8))])
    surface(name,vertices,faces,material,[{foot:1}]*len(vertices))

for kind in ['sneakers','boots','flipflops','sandals']:
    start=len(meshes);prefix='look-footwear-'+kind
    for side,s in [('L',1),('R',-1)]:
        foot='foot.'+side;shin='shin.'+side;x=s*.112
        shoe_sole(prefix+'-sole-'+side,x,foot)
        if kind in ['sneakers','boots']:
            material=shoe if kind=='sneakers' else leather
            shoe_upper(prefix+'-upper-'+side,x,foot,material)
            rings(prefix+'-ankle-'+side,[((x,.009,.082),.049,.058,{foot:1}),((x,.006,.137 if kind=='sneakers' else .224),.045,.051,{'shin.'+side:1})],material,cap=False)
            for y,z in [(-.094,.112),(-.063,.121),(-.032,.126)]:capsule(prefix+'-lace-'+side,(x-.032,y,z),(x+.032,y,z),(.003,.003),trim,foot)
        elif kind=='flipflops':
            for sign in [-1,1]:capsule(prefix+'-thong-'+side,(x,-.143,.077),(x+sign*.047,-.051,.080),(.008,.010),leather,foot)
        else:
            for y in [-.126,-.042]:capsule(prefix+'-strap-'+side,(x-.05,y,.078),(x+.05,y,.078),(.015,.010),leather,foot)
            capsule(prefix+'-heel-'+side,(x-.042,.039,.076),(x+.042,.039,.076),(.011,.013),leather,foot)
    finish_group(prefix,start)

exec(compile(open(os.path.join(ROOT,'tools','avatar-wardrobe-v3.py'),encoding='utf-8').read(),'avatar-wardrobe-v3.py','exec'))

for o in meshes:
    mod=o.modifiers.new('shared-humanoid-skeleton','ARMATURE');mod.object=rig;o.parent=rig
for name,bone_name in [('hair','head'),('top','chest'),('bottom','pelvis'),('shoe-L','foot.L'),('shoe-R','foot.R')]:
    o=bpy.data.objects.new('socket-'+name,None);scene.collection.objects.link(o);o.parent=rig;o.parent_type='BONE';o.parent_bone=bone_name;o.location=(0,0,0)

def leg_knee(h,a,l1=.405,l2=.410):
    d=a-h;length=min(d.length,l1+l2-.001);v=d.normalized();mid=(length*length+l1*l1-l2*l2)/(2*length)
    # Bend toward -Y, i.e. forward, not sideways.
    forward=Vector((0,-1,0));bend=(forward-v*forward.dot(v)).normalized()
    return h+v*mid+bend*math.sqrt(max(0,l1*l1-mid*mid))
def pose_bone(name,h,t):
    pb=rig.pose.bones[name];rh,rt=rest[name]
    q=(rt-rh).rotation_difference(Vector(t)-Vector(h))
    pb.matrix=Matrix.Translation(Vector(h)) @ q.to_matrix().to_4x4() @ rig.data.bones[name].matrix_local.to_3x3().to_4x4()
    bpy.context.view_layer.update()

WALK_STRIDE=.90
def smooth(t):
    t=max(0,min(1,t));return t*t*(3-2*t)

def walking_foot(p):
    if p<=.6:
        y=-.27+WALK_STRIDE*p
        pitch=math.radians(-12*(1-smooth(p/.13))+24*smooth((p-.40)/.20))
        clearance=0
    else:
        t=(p-.6)/.4
        y=(2*t**3-3*t*t+1)*.27+(t**3-2*t*t+t)*.36+(-2*t**3+3*t*t)*(-.27)+(t**3-t*t)*.36
        pitch=math.radians(24-36*smooth(t))
        clearance=.045*math.sin(math.pi*t)**2
    # Ground the actual bevelled polygon outsole through heel strike and toe-off.
    z=-min(y*math.sin(pitch)+(z-.095)*math.cos(pitch) for y,z in SOLE_PROFILE)+.002+clearance
    return y,z,pitch

def set_pose(kind,phase):
    # Pose all joints from world-space targets, then key local transforms.
    bob=0;sway=0;hip_rotation=Matrix.Identity(3);chest_rotation=Matrix.Identity(3)
    if kind=='walk':
        cycle=phase*2*math.pi
        # Weight peaks above the supporting foot during single support. Pelvic
        # list and axial rotation complement the foot arc; shoulders counter it.
        sway=.021*math.sin(cycle-.30)
        hip_rotation=Matrix.Rotation(.074*math.cos(cycle),3,'Z') @ Matrix.Rotation(.043*math.sin(cycle-.30),3,'Y')
        chest_rotation=Matrix.Rotation(-.055*math.cos(cycle),3,'Z') @ Matrix.Rotation(-.015*math.sin(cycle-.30),3,'Y')
        height=.870+.031*math.sin((phase% .5)*math.pi/.5)
        for s,offset in [(1,0),(-1,.5)]:
            p=(phase+offset)%1
            y,z,pitch=walking_foot(p)
            local_hip=hip_rotation@Vector((s*.112,0,0))
            horizontal=(s*.112-sway-local_hip.x)**2+(y-local_hip.y)**2
            height=min(height,z+math.sqrt(.814**2-horizontal)-local_hip.z)
        bob=height-.91
    pelvis=Vector((sway,0,.91+bob));sp=pelvis+hip_rotation@Vector((0,0,.11));ch=sp+Vector((-.3*sway,0,.21));neck=ch+chest_rotation@Vector((0,0,.20));head=neck+Vector((0,0,.11));top=head+Vector((0,0,.24))
    if kind in ['idle','sleep']:
        breath=math.sin(phase*math.pi*2)
        ch.y-=.0015*breath
        for p in [neck,head,top]:p.z+=.0022*breath;p.y-=.0015*breath
    if kind=='seated':
        for p in [pelvis,sp,ch,neck,head,top]:p.z-=.38
    targets={'pelvis':(pelvis,sp),'spine':(sp,ch),'chest':(ch,neck),'neck':(neck,head),'head':(head,top)}
    for side,s,offset in [('L',1,0),('R',-1,.5)]:
        h=pelvis+hip_rotation@Vector((s*.112,0,0));a=Vector((s*.112,0,.095));toe=Vector((s*.112,-.145,.055));tip=Vector((s*.112,-.205,.045))
        p=(phase+offset)%1
        if kind=='walk':
            a.y,a.z,pitch=walking_foot(p)
            roll=Matrix.Rotation(pitch,3,'X')
            toe=a+roll@Vector((0,-.145,-.04));tip=a+roll@Vector((0,-.205,-.05))
        if kind=='seated':
            knee=h+Vector((0,-.397,-.07));a=knee+Vector((0,-.01,-.402));toe=a+Vector((0,-.145,-.04));tip=a+Vector((0,-.205,-.05))
        elif kind=='sleep':
            # Mildly curled legs, with the upper knee slightly further forward.
            bend=.32 if side=='L' else .23
            knee=h+Vector((0,-.405*math.sin(bend),-.405*math.cos(bend)))
            a=knee+Vector((0,.410*math.sin(bend+.18),-.410*math.cos(bend+.18)))
            toe=a+Vector((0,-.145,-.04));tip=a+Vector((0,-.205,-.05))
        else:knee=leg_knee(h,a)
        targets['thigh.'+side]=(h,knee);targets['shin.'+side]=(knee,a);targets['foot.'+side]=(a,toe);targets['toe.'+side]=(toe,tip)
        sh=neck+chest_rotation@Vector((s*.225,0,-.025));el=sh+Vector((s*.02,-.01,-.274));wr=el+Vector((s*.005,-.01,-.235))
        if kind=='walk':
            # Opposite to the advancing ipsilateral leg; sagittal swing only.
            swing=.23*math.cos(p*math.pi*2-.08)
            el=sh+Vector((s*.02,.275*math.sin(swing),-.275*math.cos(swing)))
            bend=.16+.035*math.sin(p*math.pi*2)
            wr=el+Vector((s*.005,.235*math.sin(swing-bend),-.235*math.cos(swing-bend)))
        if kind=='sleep':
            # Forearms fold in front of the chest; hands rest below the face.
            # Bring the shoulders forward/inward so the lower arm lies beside
            # the face rather than bearing the torso's weight under the bed.
            sh=neck+Vector((s*.120,-.025,-.025))
            el=sh+Vector((-s*.02,-.19,-.195))
            wr=el+Vector((-s*.05,-.035,.226))
        if kind in ['wash','reach','seated','open-door']:
            amount=math.sin(phase*2*math.pi+(0 if s>0 else .7))
            el=sh+Vector((s*.008,-.10,-.257))
            if kind=='seated':wr=el+Vector((-s*.025,-.232,.034+.009*amount))
            elif kind=='wash':wr=el+Vector((-s*.04,-.23,.025+.028*amount))
            elif s>0:el=sh+Vector((0,-.21,-.17));wr=el+Vector((0,-.23,.025+.018*amount))
            if kind=='open-door':
                if s<0:
                    push=smooth((phase-.10)/.45)
                    wr=sh+Vector((0,-.24-.20*push,-.23+.035*push));el=leg_knee(sh,wr,.276,.235)
                else:el=sh+Vector((s*.02,-.01,-.274));wr=el+Vector((s*.005,-.01,-.235))
        hand_tip=wr+(wr-el).normalized()*.105
        if kind=='switch' and side=='R':
            time=phase*.7
            tap=smooth((time-.035)/.22) if time<.38 else 1-smooth((time-.38)/.32)
            wr=wr.lerp(Vector((-.25,-.373,1.22)),tap)
            d=wr-sh;length=d.length;v=d.normalized();l1=.276;l2=.235
            mid=(length*length+l1*l1-l2*l2)/(2*length)
            down=Vector((0,0,-1));bend=(down-v*down.dot(v)).normalized()
            el=sh+v*mid+bend*math.sqrt(max(0,l1*l1-mid*mid))
            hand_direction=(wr-el).normalized().lerp(Vector((0,-1,0)),tap).normalized()
            hand_tip=wr+hand_direction*.105
        targets['upper_arm.'+side]=(sh,el);targets['forearm.'+side]=(el,wr);targets['hand.'+side]=(wr,hand_tip)
    for name,(h,t) in targets.items():
        pose_bone(name,h,t)
        if kind=='walk' and name in ['pelvis','chest']:
            rotation=hip_rotation if name=='pelvis' else chest_rotation
            rig.pose.bones[name].matrix=Matrix.Translation(h) @ rotation.to_4x4() @ rig.data.bones[name].matrix_local.to_3x3().to_4x4()
            bpy.context.view_layer.update()
    if kind=='sleep':
        # Preserve axial bone twist. Rotating targets alone leaves the face up.
        # Head is glTF -Z (world -X at yaw +90); face glTF +X (world -Z wall).
        transform=Matrix.Rotation(-math.pi/2,4,'X') @ Matrix.Rotation(math.pi/2,4,'Z') @ Matrix.Translation(Vector((0,0,-.90)))
        posed={name:transform@rig.pose.bones[name].matrix.copy() for name in targets}
        for name,matrix in posed.items():
            rig.pose.bones[name].matrix=matrix;bpy.context.view_layer.update()
    return {name:{'head':list(rig.pose.bones[name].head),'tail':list(rig.pose.bones[name].tail)} for name in targets}

rig.animation_data_create();clips={};walk_samples=[]
for kind in ['idle','walk','seated','sleep','wash','reach','open-door','switch']:
    action=bpy.data.actions.new(kind);rig.animation_data.action=action
    last=31 if kind=='walk' else 22 if kind=='switch' else 61
    for sample_frame in range(1,last+1):
        frame=sample_frame-1 if kind=='switch' else sample_frame
        scene.frame_set(frame);sample=set_pose(kind,(sample_frame-1)/(last-1))
        if kind=='walk':walk_samples.append(sample)
        for pb in rig.pose.bones:
            pb.rotation_mode='QUATERNION'
            pb.keyframe_insert(data_path='location',frame=frame)
            pb.keyframe_insert(data_path='rotation_quaternion',frame=frame)
            pb.keyframe_insert(data_path='scale',frame=frame)
    for fc in action.fcurves:
        for kp in fc.keyframe_points:kp.interpolation='LINEAR'
    track=rig.animation_data.nla_tracks.new();track.name=kind;strip=track.strips.new(kind,0 if kind=='switch' else 1,action);strip.name=kind;track.mute=True
    clips[kind]={'frames':last,'loop':kind not in ['open-door','switch']}
rig.animation_data.action=None
for track in rig.animation_data.nla_tracks:track.mute=False
scene.frame_start=1;scene.frame_end=61;scene.frame_set(1)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'mannequin.glb'),export_format='GLB',export_extras=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_nla_strips=True,export_force_sampling=True,export_def_bones=True,export_skins=True)
# Export every variant and clip, then make the editable source pleasant to open.
default_looks={'look-hair-crop','look-face-oval','look-top-tee','look-bottom-jeans','look-footwear-sneakers'}
for o in meshes:
    hidden=o.name.startswith('look-') and o.name not in default_looks
    o.hide_set(hidden);o.hide_render=hidden
for track in rig.animation_data.nla_tracks:track.mute=track.name!='idle'
scene.frame_set(1)
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'assets','source','mannequin-v3.blend'))
with open(os.path.join(OUT,'rig.json'),'w') as f:json.dump({
 'height':1.85,'forward':'local +Z in glTF',
 'wardrobe':'All look-{category}-{value} meshes bind to the same 19-bone armature. Show exactly one value per category; none hides the category.',
 'looks':{'hair':['bald','lake','buzz','crop','parted','bowl','messy','longshag'],'face':['oval','square','long'],'beard':['none','stubble','short','full','goatee','chinstrap'],'mustache':['none','pencil','classic','walrus','handlebar','horseshoe'],'top':['tee','shirt','hoodie','sweater','tank','turtleneck'],'bottom':['jeans','skinny','breeches','shorts','sports'],'footwear':['sneakers','canvas','boots','flipflops','sandals']},
 'walk':{'strideDistance':WALK_STRIDE,'duration':1.0,'stanceFraction':.6,'swingClearance':.045,'soleProfile':SOLE_PROFILE,'pelvisHeightRange':[min(s['pelvis']['head'][2] for s in walk_samples),max(s['pelvis']['head'][2] for s in walk_samples)],'heelStrikeDegrees':-12,'toeOffDegrees':24},
 'clips':clips},f,indent=2)
with open(os.path.join(OUT,'walk-audit.json'),'w') as f:json.dump(walk_samples,f)
print('V3_MANNEQUIN_READY')
