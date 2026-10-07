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
for kind in ['lake','buzz','messy','longshag']:
    start=len(meshes);prefix='look-hair-'+kind
    if kind in ['messy','longshag']:hair_cap(prefix+'-cap','shaggy')
    else:
        verts=[];faces=[];n=48
        for row in range(9):
            for j in range(n):
                a=2*math.pi*j/n;front=max(0,-math.sin(a))
                polar=(.72 if kind=='lake' else .025)+(1.65-.62*front-(.72 if kind=='lake' else .025))*row/8
                z=1.668+.185*math.cos(polar)
                sizes=[]
                for profile in face_profiles.values():
                    extended=profile+[(1.855,.001,.001)]
                    for (lo,rx,ry),(hi,xx,yy) in zip(extended,extended[1:]):
                        if lo<=z<=hi:
                            t=(z-lo)/(hi-lo);sizes.append((rx+(xx-rx)*t,ry+(yy-ry)*t));break
                rx=max(v[0] for v in sizes)+.003;ry=max(v[1] for v in sizes)+.003
                verts.append((rx*math.copysign(abs(math.cos(a))**.78,math.cos(a)),-.012+ry*math.copysign(abs(math.sin(a))**.78,math.sin(a)),z))
        for row in range(8):
            for j in range(n):
                if kind=='lake' and math.sin(2*math.pi*j/n)<-.65:continue
                faces.append((row*n+j,row*n+(j+1)%n,(row+1)*n+(j+1)%n,(row+1)*n+j))
        surface(prefix+'-shell',verts,faces,hair,[{'head':1}]*len(verts))
        if kind=='buzz':
            for row in range(1,8):
                for j in range(0,n,3):
                    v=verts[row*n+j];ellipsoid(prefix+'-texture',v,(.0025,.0025,.0025),hair_highlight,'head')
    if kind in ['messy','longshag']:
        for j in range(18):
            a=2*math.pi*j/18;front=max(0,-math.sin(a));z=1.68-(.16 if kind=='longshag' else .045)*(1-front)+.015*math.sin(j*4)
            capsule(prefix+'-layer',(.125*math.cos(a),-.01+.108*math.sin(a),1.79),(.153*math.cos(a+.12),-.012+.126*math.sin(a+.12),z),(.028,.022),hair if j%3 else hair_highlight,'head')
        for j in range(6):
            x=-.09+j*.034
            capsule(prefix+'-fringe',(x-.025,-.09,1.815),(x+.022,-.139,1.727+(j%3)*.014),(.025,.015),hair,'head')
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
