"""Additional authored wardrobe; executed in the builder's geometry context."""
# Explicit tint channels travel with glTF material extras. Fixed trims never tint.
for channel,materials in [('top',[tee,shirt,hoodie,sweater]),('bottom',[denim,denim_pocket,twill,shorts_mat,sports]),('footwear',[shoe])]:
    for material in materials:material['tintChannel']=channel
footwear_leather=leather.copy();footwear_leather.name='footwear-leather';footwear_leather['tintChannel']='footwear'
for obj in meshes:
    if obj.name.startswith('look-footwear-'):
        for slot in obj.material_slots:
            if slot.material==leather:slot.material=footwear_leather
white_trim=mat('fixed-white-sports-markings',(.92,.92,.89))

# Preserve the old saved shaggy silhouette under its accurate new name.
old=bpy.data.objects.get('look-hair-shaggy');old.name='look-hair-bowl'
buzz_skin=mat('shaved-scalp-skin-mix',(.285,.179,.121))
for face,profile in face_profiles.items():
    # Use the very same vertices/top cap as this head, then offset by 3 mm.
    # A shared envelope would turn the shorter oval skull into a pointed roof.
    scalp=[Vector(face_point(z,rx,ry,j)) for z,rx,ry in profile for j in range(16)]
    head_faces=[(i*16+j,i*16+(j+1)%16,(i+1)*16+(j+1)%16,(i+1)*16+j) for i in range(len(profile)-1) for j in range(16)]
    head_faces.append(tuple((len(profile)-1)*16+j for j in range(16)))
    bm=bmesh.new()
    for v in scalp:bm.verts.new(v)
    bm.verts.ensure_lookup_table()
    for f in head_faces:bm.faces.new([bm.verts[j] for j in f])
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.normal_update()
    normals=[v.normal.copy() for v in bm.verts];bm.free()
    offset=[tuple(v+n*.003) for v,n in zip(scalp,normals)]
    for kind in ['lake','buzz']:
        start=len(meshes);prefix='look-hair-'+kind;faces=[]
        for row in range(4,len(profile)-1):
            for j in range(16):
                front=math.sin(2*math.pi*(j+.5)/16)<-.55
                if kind=='lake' and (front or row>5):continue
                if kind=='buzz' and row==4 and front:continue
                faces.append((row*16+j,row*16+(j+1)%16,(row+1)*16+(j+1)%16,(row+1)*16+j))
        if kind=='buzz':faces.append(head_faces[-1])
        used=sorted({v for f in faces for v in f});remap={v:i for i,v in enumerate(used)}
        surface(prefix+'-shell',[offset[v] for v in used],[tuple(remap[v] for v in f) for f in faces],buzz_skin if kind=='buzz' else hair,[{'head':1}]*len(used))
        if kind=='buzz':
            # Stipple sits on each face's actual offset polygons, including crown.
            for f in faces:
                points=[Vector(offset[v]) for v in f]
                for t in [.25,.65]:
                    v=points[0].lerp(points[1],t).lerp(points[-1].lerp(points[-2],t),.45)
                    ellipsoid(prefix+'-texture',v,(.0012,.0012,.0012),stubble,'head')
        obj=finish_group(prefix+('' if face=='oval' else '-'+face),start);obj['faceVariant']=face

# The reference cuts use broad swept planes with pointed ends, not tube locks.
old=bpy.data.objects.get('look-hair-parted');meshes.remove(old);bpy.data.objects.remove(old,do_unlink=True)
def scalp_radii(z):
    sizes=[]
    for profile in face_profiles.values():
        extended=profile+[(1.860,.001,.001)]
        for (lo,rx,ry),(hi,xx,yy) in zip(extended,extended[1:]):
            if lo<=z<=hi:
                t=(z-lo)/(hi-lo);sizes.append((rx+(xx-rx)*t,ry+(yy-ry)*t));break
    return (max(v[0] for v in sizes),max(v[1] for v in sizes)) if sizes else (.005,.005)
def tapered_lock(name,path,width,axis,normal,material):
    axis=Vector(axis).normalized();normal=Vector(normal).normalized();verts=[]
    for center,factor,depth in [(path[0],1,.005),(path[1],.68,.008)]:
        center=Vector(center)
        for a,b in [(-1,-1),(1,-1),(1,1),(-1,1)]:verts.append(tuple(center+axis*(width*factor*a)+normal*(depth*b)))
    verts.append(path[2]);faces=[(3,2,1,0)]
    for j in range(4):faces.extend([(j,(j+1)%4,(j+1)%4+4,j+4),(j+4,(j+1)%4+4,8)])
    surface(name,verts,faces,material,[{'head':1}]*len(verts))
for kind in ['parted','messy','longshag']:
    start=len(meshes);prefix='look-hair-'+kind;verts=[];faces=[];n=24;rows=8
    for row in range(rows+1):
        t=row/rows
        for j in range(n):
            a=2*math.pi*j/n;front=max(0,-math.sin(a))
            # Lift the right fringe into a pronounced opening over the eye.
            lower=1.66+( .112 if kind=='parted' else .105)*front
            if kind!='parted':lower+=.027*front*max(0,math.cos(a))
            z=1.856*(1-t)+lower*t
            rx,ry=scalp_radii(z);extra=.003 if kind=='parted' else .010
            x=(rx+extra)*math.copysign(abs(math.cos(a))**.78,math.cos(a));y=-.012+(ry+extra)*math.copysign(abs(math.sin(a))**.78,math.sin(a))
            z+=(.028 if kind=='parted' else .013)*math.sin(math.pi*t)*(1 if kind=='parted' else 1+.4*math.sin(j*2.3))
            verts.append((x,y,z))
    for row in range(rows):
        for j in range(n):faces.append((row*n+j,row*n+(j+1)%n,(row+1)*n+(j+1)%n,(row+1)*n+j))
    faces.append(tuple(reversed(range(n))))
    surface(prefix+'-shaped-scalp',verts,faces,hair,[{'head':1}]*len(verts))
    if kind=='parted':
        # Broad connected-looking diagonals flow from a high right part to left temple.
        for j in range(5):
            y=.062-j*.035
            tapered_lock(prefix+'-sweep',[(.092,y,1.818),(.008,y-.038,1.872-j*.004),(-.124,y-.055,1.757+j*.013)],.026,(0,1,0),(0,0,1),hair_highlight if j==2 else hair)
        tapered_lock(prefix+'-sideways-fringe',[(.075,-.104,1.807),(-.014,-.135,1.792),(-.114,-.122,1.735)],.024,(0,0,1),(0,-1,0),hair)
    else:
        # Uneven diagonal fringe: left tips lower, right eyebrow/eye stays exposed.
        fringe=[(.077,-.038,1.727),(.025,-.087,1.706),(-.022,-.129,1.691)] if kind=='messy' else [(.077,-.064,1.755),(.025,-.114,1.734),(-.022,-.134,1.713)]
        for j,(rootx,tipx,tipz) in enumerate(fringe):
            middle=1.785-j*.017 if kind=='messy' else 1.800-j*.016
            tapered_lock(prefix+'-diagonal-fringe',[(rootx,-.075,1.835-j*.009),((rootx+tipx)/2,-.139,middle),(tipx,-.138 if kind=='messy' else -.132,tipz)],.025,(0,0,1),(0,-1,0),hair_highlight if j==1 else hair)
        # Side/back layers alternate slant, length and width; triangular nape ends.
        for j in range(13):
            a=.12+math.pi*j/12;s=1 if math.cos(a)>=0 else -1
            z=1.565+.047*math.sin(j*2.1) if kind=='messy' else 1.50+.061*math.sin(j*1.8)
            tipa=a+(.18 if j%2 else -.16)
            tapered_lock(prefix+'-layer',[(.124*math.cos(a),-.008+.107*math.sin(a),1.784),(.149*math.cos(a+.07),.129*math.sin(a+.07),1.68),(.162*math.cos(tipa),.138*math.sin(tipa),z)],.025+(j%3)*.004,(-math.sin(a),math.cos(a),0),(math.cos(a),math.sin(a),0),hair_highlight if j%4==1 else hair)
        for s in [-1,1]:
            tapered_lock(prefix+'-temple',[(s*.112,-.045,1.773),(s*.151,-.050,1.70),(s*.151,-.031,1.606 if kind=='longshag' else 1.618)],.019,(0,1,0),(s,0,0),hair)
    finish_group(prefix,start)

# Each beard is one curved surface, fitted independently to each actual jaw.
for obj in list(meshes):
    if obj.name.startswith(('look-beard-','look-mustache-')):
        if obj.name=='look-beard-stubble':
            obj['faceVariant']='oval'
            continue
        meshes.remove(obj);bpy.data.objects.remove(obj,do_unlink=True)
def jaw_radii(profile,z):
    if z<=profile[0][0]:return profile[0][1:]
    for (a,ax,ay),(b,bx,by) in zip(profile,profile[1:]):
        if a<=z<=b:
            t=(z-a)/(b-a);return ax+(bx-ax)*t,ay+(by-ay)*t
    return profile[-1][1:]
for face,profile in face_profiles.items():
    for kind in ['stubble','short','full','goatee','chinstrap']:
        if kind=='stubble' and face=='oval':continue
        start=len(meshes);verts=[];faces=[];n=32;rows=8
        for row in range(rows):
            t=row/(rows-1)
            for j in range(n+1):
                u=j/n;a=math.pi+math.pi*u;center=math.sin(math.pi*u)
                top=1.646-.058*center
                if kind=='goatee':top=1.589
                chin=profile[0][0]-(.035 if kind=='full' else .012 if kind in ['short','goatee'] else 0)
                if kind=='chinstrap':top=chin+.034+.085*abs(math.cos(a))
                z=top*(1-t)+chin*t;rx,ry=jaw_radii(profile,z)
                relief=.002 if kind=='stubble' else .004+(.022 if kind=='full' else .009)*math.sin(math.pi*t)
                verts.append((math.copysign(abs(math.cos(a))**.78,math.cos(a))*(rx+relief),-.012+math.copysign(abs(math.sin(a))**.78,math.sin(a))*(ry+relief),z))
        for row in range(rows-1):
            for j in range(n):
                if kind=='goatee' and not 11<=j<=20:continue
                faces.append((row*(n+1)+j,row*(n+1)+j+1,(row+1)*(n+1)+j+1,(row+1)*(n+1)+j))
        obj=surface('look-beard-'+kind,verts,faces,stubble if kind=='stubble' else beard_brown,[{'head':1}]*len(verts))
        if kind!='stubble':
            obj.data.materials.append(beard_edge);obj.data.materials.append(beard_plane)
            for p in obj.data.polygons:p.material_index=1 if p.index<n else 2 if p.index%4==1 else 0
        obj=finish_group('look-beard-'+kind+('' if face=='oval' else '-'+face),start);obj['faceVariant']=face
    for kind in ['pencil','classic','walrus','handlebar','horseshoe']:
        start=len(meshes);prefix='look-mustache-'+kind
        width=.043 if kind=='walrus' else .038
        high=1.632;low=1.625 if kind=='pencil' else 1.610 if kind=='walrus' else 1.617
        def lip_point(x,z):
            rx,ry=jaw_radii(profile,z)
            y=-.012-ry*max(0,1-(abs(x)/rx)**(2/.78))**(.78/2)-.004
            return (x,y,z)
        vv=[lip_point(-width+2*width*j/12,z-.005*abs(2*j/12-1)) for z in [high,low] for j in range(13)]
        ff=[(j,j+1,13+j+1,13+j) for j in range(12)]
        surface(prefix+'-curved-lip',vv,ff,hair,[{'head':1}]*len(vv),thickness=.002)
        for s in [-1,1]:
            if kind=='handlebar':
                capsule(prefix+'-curl',lip_point(s*.030,1.620),lip_point(s*.056,1.634),(.005,.005),hair,'head')
                capsule(prefix+'-tip',lip_point(s*.056,1.634),lip_point(s*.052,1.644),(.004,.004),hair,'head')
            if kind=='horseshoe':capsule(prefix+'-leg',lip_point(s*.036,1.622),lip_point(s*.037,1.566),(.009,.005),hair,'head')
        obj=finish_group(prefix+('' if face=='oval' else '-'+face),start);obj['faceVariant']=face

# Sleeveless torso uses the same sewn armhole boundary; no detached shoulder caps.
for kind in ['tank','turtleneck']:
    start=len(meshes);prefix='look-top-'+kind
    obj=torso_garment(prefix,tee,-.002,kind)
    if kind=='turtleneck':rings(prefix+'-neck',[((0,0,1.438),.064,.060,{'neck':1}),((0,0,1.51),.061,.057,{'neck':1})],tee,cap=False)
    finish_group(prefix,start)
# Thick roll neck and knit ribs remain part of the sweater.
start=len(meshes);original=bpy.data.objects.get('look-top-sweater');meshes.remove(original);meshes.append(original);start=len(meshes)-1
rings('knitted-roll-neck',[((0,0,1.436),.078,.073,{'neck':1}),((0,0,1.505),.075,.070,{'neck':1}),((0,0,1.518),.069,.064,{'neck':1})],sweater,cap=False)
finish_group('look-top-sweater',start)

# Skinny follows the same connected crotch; narrowing only below the upper thigh.
start=len(meshes);pants_surface('look-bottom-skinny-fabric',denim,'jeans');obj=finish_group('look-bottom-skinny',start)
for v in obj.data.vertices:
    if v.co.z<.72:
        s=1 if v.co.x>=0 else -1;v.co.x=s*.112+(v.co.x-s*.112)*.80;v.co.y*=.83
# Sports marks are separate fixed white material, weighted along the moving legs.
obj=bpy.data.objects.get('look-bottom-sports')
for slot in obj.material_slots:
    if slot.material==trim:slot.material=white_trim
start=len(meshes);meshes.remove(obj);meshes.append(obj);start=len(meshes)-1
bpy.ops.object.text_add(location=(.058,-.115,.74),rotation=(math.pi/2,0,0));text=bpy.context.object;text.data.body='sport';text.data.size=.025;text.data.extrude=.0004;bpy.ops.object.convert(target='MESH');text.data.materials.append(white_trim);weight(text,'thigh.L')
finish_group('look-bottom-sports',start)
start=len(meshes)
for side,s in [('L',1),('R',-1)]:
    foot='foot.'+side;x=s*.112;shoe_sole('canvas-sole',x,foot);shoe_upper('canvas-upper',x,foot,shoe)
    rings('canvas-cuff',[((x,.009,.085),.047,.054,{foot:1}),((x,.006,.155),.042,.048,{'shin.'+side:1})],shoe,cap=False)
    for y in [-.11,-.08,-.05,-.02]:capsule('canvas-lace',(x-.029,y,.125),(x+.029,y,.125),(.002,.002),white_trim,foot)
obj=finish_group('look-footwear-canvas',start)
for slot in obj.material_slots:
    if slot.material==sole:slot.material=white_trim
for v in obj.data.vertices:
    if v.co.z<=.031:v.co.z*=1.22
    s=1 if v.co.x>=0 else -1;v.co.x=s*.112+(v.co.x-s*.112)*.94
# Tall boot shafts, with shin weights retained.
obj=bpy.data.objects.get('look-footwear-boots')
for v in obj.data.vertices:
    if v.co.z>.14:v.co.z=.14+(v.co.z-.14)*2.4
# High canvas shoes keep the characteristic light rubber sole and fabric cuff.
obj=bpy.data.objects.get('look-footwear-highcanvas')
for slot in obj.material_slots:
    if slot.material in [sole,trim]:slot.material=white_trim
