"""Authored Soviet cutaway: baked art, depth proxies and independently hinged props."""
import bpy, math, json, os, random, sys, subprocess
from mathutils import Vector, Matrix
random.seed(19)
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0,os.path.join(ROOT,'tools'))
from apartment_v3_details import add_home_details
from apartment_v3_cameras import camera_views, export_static, add_first_person_shell
from apartment_v3_layout import load_layout, motion_config, to_blender, output_paths
from apartment_v3_exterior import add_exterior, export_geometry
OUT,SOURCE_OUT=output_paths(sys.argv,ROOT)
LAYOUT=load_layout()
bpy.context.preferences.filepaths.save_version=0
LIGHTING_STATES=dict(off=dict(night='background-off.png',day='background-day-off.png'),living=dict(night='background-living.png',day='background-day-living.png'),kitchen=dict(night='background-kitchen.png',day='background-day-kitchen.png'),both=dict(night='background.png',day='background-day.png'))

def render_light_states():
    for key,folder in [('CUDA_CACHE_PATH','cuda'),('OPTIX_CACHE_PATH','optix'),('XDG_CACHE_HOME','blender')]:
        os.environ.setdefault(key,os.path.join('D:/Codex/Caches',folder));os.makedirs(os.environ[key],exist_ok=True)
    render_scene=bpy.context.scene
    render_scene.render.threads_mode='FIXED';render_scene.render.threads=max(4,(os.cpu_count() or 8)//2)
    render_scene.cycles.samples=48
    if '--cpu' not in sys.argv:
        preferences=bpy.context.preferences.addons['cycles'].preferences
        preferences.compute_device_type='OPTIX';preferences.get_devices()
        devices=[d for d in preferences.devices if d.type=='OPTIX']
        if devices:
            for device in preferences.devices:device.use=device.type=='OPTIX'
            render_scene.cycles.device='GPU';render_scene.cycles.denoiser='OPTIX'
            print('V8_RENDER_DEVICE',','.join(d.name for d in devices),flush=True)
    bulbs={room:bpy.data.objects['lamp-'+room+'-bulb'] for room in ['living','kitchen']}
    lamps={room:bpy.data.objects['warm-ceiling-pool-'+room] for room in ['living','kitchen']}
    for period in ['night','day']:
        is_day=period=='day'
        render_scene.world.node_tree.nodes['Background'].inputs[1].default_value=.42 if is_day else .28
        render_scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.28,.34,.40,1) if is_day else (.022,.031,.054,1)
        for obj in render_scene.objects:
            if obj.name.startswith('cool-window-fill'):obj.data.energy=205 if is_day else 100;obj.data.color=(.72,.83,.90) if is_day else (.32,.48,1)
            if obj.name.startswith('distant-window'):obj.hide_render=is_day
            if obj.name.startswith('exterior-lit-'):obj.hide_render=is_day
            if obj.name=='exterior-overcast':obj.data.energy=30000 if is_day else 650
        for state in ['both','off','living','kitchen']:
            for room in ['living','kitchen']:
                enabled=state in [room,'both'];lamps[room].data.energy=(95 if is_day else 150) if enabled else 0
                bulbs[room].data.materials[0].node_tree.nodes.get('Principled BSDF').inputs['Emission Strength'].default_value=3 if enabled else 0
            render_scene.render.filepath=os.path.join(OUT,LIGHTING_STATES[state][period]);bpy.ops.render.render(write_still=True)
            print('V8_BACKDROP_READY',period,state,flush=True)

if '--static-existing' in sys.argv:
    import struct
    bpy.ops.wm.open_mainfile(filepath=os.path.join(SOURCE_OUT,'apartment-cutaway-v3.blend'))
    scene=bpy.context.scene;scene.cycles.samples=8
    preferences=bpy.context.preferences.addons['cycles'].preferences;preferences.compute_device_type='OPTIX';preferences.get_devices()
    for device in preferences.devices:device.use=device.type=='OPTIX'
    scene.cycles.device='GPU'
    with open(os.path.join(OUT,'interaction.glb'),'rb') as f:data=f.read()
    gltf=json.loads(data[20:20+struct.unpack_from('<I',data,12)[0]])
    dynamic={node.get('name') for node in gltf['nodes']}
    static=[obj for obj in scene.objects if obj.type in {'MESH','CURVE'} and obj.name not in dynamic and not obj.name.startswith('depth-')]
    for obj in scene.objects:obj.hide_render=True
    def existing_shell(name,*args):return bpy.data.objects[name]
    export_static(scene,static,existing_shell,{'plaster':bpy.data.materials['dirty-warm-plaster']},OUT)
    print('V9_STATIC_READY',OUT,flush=True);sys.exit(0)

if '--render-existing' in sys.argv:
    bpy.ops.wm.open_mainfile(filepath=os.path.join(SOURCE_OUT,'apartment-cutaway-v3.blend'))
    scene=bpy.context.scene
    manifest_path=os.path.join(OUT,'scene.json')
    with open(manifest_path,encoding='utf8') as f:manifest=json.load(f)
    manifest['cameraViews']=camera_views(scene,scene.camera,OUT,render_light_states)
    manifest['camera']=manifest['cameraViews']['2D']
    with open(manifest_path,'w',encoding='utf8') as f:json.dump(manifest,f,ensure_ascii=False,indent=2)
    scene.camera.location=(1.5,-12,1.35+12*math.tan(math.radians(8)))
    scene.camera.rotation_euler=(Vector((1.5,0,1.35))-scene.camera.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SOURCE_OUT,'apartment-cutaway-v3.blend'))
    print('V3_APARTMENT_READY',OUT,flush=True);sys.exit(0)

bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene
scene.render.engine='CYCLES'
scene.render.threads_mode='FIXED';scene.render.threads=max(4,(os.cpu_count() or 8)//2)
scene.cycles.samples=48
preferences=bpy.context.preferences.addons['cycles'].preferences
preferences.compute_device_type='OPTIX';preferences.get_devices()
for device in preferences.devices:device.use=device.type=='OPTIX'
scene.cycles.device='GPU'
scene.render.use_persistent_data=True
scene.cycles.use_denoising=True
scene.render.resolution_x=3840;scene.render.resolution_y=1536;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.065,.085,.12,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.28
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast'
static=[];moving=[];proxies=[]

def material(name,c1,c2=None,scale=6,rough=.78,wood=False):
    m=bpy.data.materials.new(name);m.diffuse_color=(*c1,1);m.use_nodes=True
    n=m.node_tree.nodes;l=m.node_tree.links;p=n.get('Principled BSDF')
    p.inputs['Roughness'].default_value=rough
    p.inputs['Base Color'].default_value=(*c1,1)
    if c2:
        tex=n.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=scale;tex.inputs['Detail'].default_value=4;tex.inputs['Roughness'].default_value=.73
        coord=n.new('ShaderNodeTexCoord')
        mapping=n.new('ShaderNodeVectorMath');mapping.operation='MULTIPLY';mapping.inputs[1].default_value=(3,3,.18) if wood else (1,1,1)
        l.new(coord.outputs['Generated'],mapping.inputs[0]);l.new(mapping.outputs[0],tex.inputs['Vector'])
        ramp=n.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].position=.26;ramp.color_ramp.elements[1].position=.74
        ramp.color_ramp.elements[0].color=(*c1,1);ramp.color_ramp.elements[1].color=(*c2,1)
        l.new(tex.outputs['Fac'],ramp.inputs[0]);l.new(ramp.outputs[0],p.inputs['Base Color'])
        bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.17;bump.inputs['Distance'].default_value=.025
        l.new(tex.outputs['Fac'],bump.inputs['Height']);l.new(bump.outputs[0],p.inputs['Normal'])
    return m

M={
'wall':material('faded-olive-wallpaper',(.10,.135,.083),(.23,.26,.153),7),
'plaster':material('dirty-warm-plaster',(.21,.195,.15),(.48,.445,.34),8),
'chip':material('exposed-plaster',(.26,.255,.207),(.36,.35,.29),10),
'wood':material('worn-walnut',(.068,.032,.014),(.25,.13,.049),5,wood=True),
'oak':material('old-ochre-wood',(.13,.065,.025),(.39,.225,.094),5,wood=True),
'floor':material('floorboards',(.10,.061,.028),(.23,.158,.069),5,wood=True),
'teal':material('worn-kitchen-enamel',(.045,.115,.108),(.14,.22,.19),8),
'cream':material('aged-enamel',(.33,.31,.24),(.66,.64,.51),9),
'tilewhite':material('ivory-ceramic',(.34,.32,.25),(.59,.55,.43),12,.4),
'tileblack':material('charcoal-ceramic',(.045,.06,.055),(.10,.13,.109),9,.45),
'grout':material('old-grout',(.10,.11,.085)),
'dark':material('near-black',(.022,.031,.026)),
'metal':material('dull-steel',(.18,.21,.20),None,rough=.32),
'brass':material('aged-brass',(.3,.2,.069),None,rough=.42),
'fabric':material('wine-blanket',(.11,.035,.029),(.24,.085,.056),75),
'linen':material('grey-pillow',(.32,.33,.275),(.53,.53,.438),44),
'plastic':material('yellowed-plastic',(.3,.30,.237),(.5,.48,.37),10),
'blue':material('dusty-blue-night-glass',(.031,.049,.065),(.073,.105,.13),3,.34),
'city':material('distant-panel-buildings',(.018,.034,.065)),
'paper':material('old-paper',(.46,.44,.34)),
}

def cube(name,loc,size,mat,bevel=.015,kind='static',parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if mat:o.data.materials.append(mat)
    if bevel:
        b=o.modifiers.new('soft-worn-edges','BEVEL');b.width=bevel;b.segments=2
        o.modifiers.new('weighted-corner-normals','WEIGHTED_NORMAL')
    if parent:o.parent=parent
    (static if kind=='static' else moving if kind=='moving' else proxies).append(o)
    return o

def cylinder(name,loc,radius,depth,mat,rotation=(0,0,0),kind='static',parent=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=20,radius=radius,depth=depth,location=loc);o=bpy.context.object;o.name=name;o.rotation_euler=rotation;o.data.materials.append(mat)
    b=o.modifiers.new('rim','BEVEL');b.width=.008;b.segments=2;o.modifiers.new('normals','WEIGHTED_NORMAL')
    if parent:o.parent=parent
    (static if kind=='static' else moving).append(o);return o

def curve(name,points,radius,mat):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=radius;c.bevel_resolution=3
    s=c.splines.new('POLY');s.points.add(len(points)-1)
    for p,co in zip(s.points,points):p.co=(*co,1)
    o=bpy.data.objects.new(name,c);scene.collection.objects.link(o);o.data.materials.append(mat);static.append(o);return o

def empty(name,loc):
    o=bpy.data.objects.new(name,None);scene.collection.objects.link(o);o.location=loc;return o

def proxy(name,loc,size):return cube('depth-'+name,loc,size,None,0,'proxy')
def aim(o,target):o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
def area(name,loc,target,power,color,size):
    bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.color=color;o.data.shape='DISK';o.data.size=size;aim(o,target);return o

# The same rectangular openings cut the substrate, tiles and wallpaper strips.
def rear_piece(name,loc,size,mat,bevel=.005):
    x,y,z=loc;w,d,h=size
    pieces=[(x-w/2,x+w/2,z-h/2,z+h/2)]
    for win in LAYOUT['windows']:
        cx,cz,_=win['center'];a=cx-win['width']/2;b=cx+win['width']/2
        low=cz-win['height']/2;high=cz+win['height']/2;next_pieces=[]
        for l,r,bottom,top in pieces:
            if r<=a or l>=b or top<=low or bottom>=high:next_pieces.append((l,r,bottom,top));continue
            if l<a:next_pieces.append((l,a,bottom,top))
            if r>b:next_pieces.append((b,r,bottom,top))
            if bottom<low:next_pieces.append((max(l,a),min(r,b),bottom,low))
            if top>high:next_pieces.append((max(l,a),min(r,b),high,top))
        pieces=next_pieces
    for l,r,bottom,top in pieces:
        if r-l>.001 and top-bottom>.001:cube(name,((l+r)/2,y,(bottom+top)/2),(r-l,d,top-bottom),mat,bevel)

left=LAYOUT['rooms']['kitchen']['x'][0];right=LAYOUT['rooms']['living']['x'][1]
cube('foundation',((left+right)/2,0,-.16),(right-left+.2,3.8,.25),M['dark'])
cube('kitchen-floor-substrate',(left/2,0,-.032),(-left,3.64,.064),M['tilewhite'],0)
cube('living-floor-substrate',(right/2,0,-.032),(right,3.64,.064),M['floor'],0)
rear_piece('rear-kitchen',(left/2,1.72,1.5),(-left,.15,3),M['plaster'])
rear_piece('rear-living',(right/2,1.72,1.5),(right,.15,3),M['wall'])
cube('left-return',(left,0,1.5),(.14,3.64,3),M['plaster'])
cube('right-return-rear',(right,.785,1.5),(.14,1.87,3),M['wall'])
cube('right-return-front',(right,-1.51,1.5),(.14,.62,3),M['wall'])
cube('right-return-lintel',(right,-.675,2.59),(.14,1.05,.82),M['wall'])
cube('ceiling-cutaway',((left+right)/2,1.50,3.02),(right-left+.3,.42,.15),M['plaster'])
cube('ceiling-back-edge',((left+right)/2,1.70,3.05),(right-left+.4,.12,.2),M['dark'])
for x in [left-.08,right+.08]:cube('facade-post',(x,-1.75,1.45),(.16,.2,3.2),M['dark'])
for ix in range(16):
    for iy in range(6):
        cube('kitchen-floor-tile',(left+.25+ix*.5,-1.45+iy*.52,-.018),(.49,.505,.045),M['tilewhite'],.004)
for row in range(10):
    for col in range(11):
        x=.38+col*.79+(row%2)*.16
        if x<right:
            width=min(.775,2*(right-x));o=cube('floor-board',(x,-1.5+row*.315,-.017),(width,.306,.046),M['floor'],.003)
for ix in range(16):
    for iz in range(4):
        rear_piece('checker-backsplash',(left+.25+ix*.5,1.625,.30+iz*.52),(.49,.027,.505),M['tilewhite' if (ix+iz)%2 else 'tileblack'],.004)
for x in range(1,29):
    xx=.05+x*.29
    rear_piece('wallpaper-faded-stripe',(xx,1.623,1.47),(.028,.006,2.92),M['chip'],0)
for i in range(60):
    x=random.uniform(.14,right-.2);z=random.uniform(.12,2.94)
    if any(abs(x-w['center'][0])<w['width']/2+.1 and abs(z-w['center'][1])<w['height']/2+.16 for w in LAYOUT['windows']):continue
    verts=[(x+math.cos(a)*random.uniform(.025,.07),1.612,z+math.sin(a)*random.uniform(.04,.15)) for a in [j*math.tau/7 for j in range(7)]]
    mesh=bpy.data.meshes.new('peel');mesh.from_pydata(verts,[],[list(range(7))]);mesh.materials.append(M['chip']);o=bpy.data.objects.new('wallpaper-peel',mesh);scene.collection.objects.link(o);static.append(o)
for x,w in [(left/2,-left-.15),(right/2,right-.15)]:cube('skirting',(x,1.57,.065),(w,.07,.13),M['wood'])

# Windows: real frames, night view and window sill; no false shelving.
def window(x,width):
    z=1.85
    # Open air, not a painted opaque pane: jambs line the genuine wall opening.
    for xx in [x-width/2,x+width/2]:cube('window-inner-reveal',(xx,1.72,z),(.035,.31,1.46),M['cream'],.003)
    for zz in [z-.73,z+.73]:cube('window-inner-reveal',(x,1.72,zz),(width,.31,.035),M['cream'],.003)
    for xx in [x-width/2,x+width/2]:
        cube('window-aged-wood-trim',(xx,1.49,z),(.13,.10,1.65),M['wood'],.008)
    for xx in [x-width/2,x,x+width/2]:
        cube('window-vertical-frame',(xx,1.43,z),(.073,.13,1.50),M['cream'],.012)
        for zz in [1.26,1.74,2.23]:
            cube('window-chipped-paint',(xx+.022,1.361,zz),(.016,.006,.085),M['oak'],.002)
    for zz in [z-.73,z,z+.73]:cube('window-cross-frame',(x,1.42,zz),(width+.11,.14,.064),M['cream'],.009)
    cube('window-latch',(x+.025,1.333,1.69),(.022,.018,.105),M['metal'],.006)
    cube('window-sill',(x,1.29,z-.78),(width+.26,.44,.07),M['cream'])
    area('cool-window-fill',(x,1.18,2.20),(x,-.5,1.05),100,(.32,.48,1),1.5)
for win in LAYOUT['windows']:window(win['center'][0],win['width'])

# Modest kitchen eating place, with room for the seated actor under the apron.
dx=-7.25
cube('dining-top',(dx,.88,.785),(1.1,.82,.085),M['oak'],.022)
for x in [dx-.46,dx+.46]:
    for y in [.57,1.20]:cube('dining-table-leg',(x,y,.375),(.065,.065,.75),M['wood'],.01)
cube('dining-chair-seat',(dx,.02,.38),(.48,.46,.07),M['wood'],.022)
cube('dining-chair-pad',(dx,.02,.425),(.45,.43,.04),M['teal'],.026)
for x in [dx-.19,dx+.19]:
    for y in [-.16,.19]:cube('dining-chair-leg',(x,y,.195),(.043,.043,.39),M['wood'],.01)
    cube('dining-chair-upright',(x,-.19,.71),(.05,.06,.67),M['wood'],.012)
cube('dining-chair-backrest',(dx,-.19,.86),(.46,.06,.21),M['oak'],.015)
proxy('dining-top',(dx,.88,.785),(1.1,.82,.085))
proxy('dining-chair-back',(dx,-.19,.86),(.46,.06,.21))

# Kitchen sink, dishes and worn cupboards.
for x in [-5.45,-4.35]:
    cube('kitchen-cabinet',(x,1.04,.45),(1.04,.72,.88),M['teal'],.02)
    cube('cabinet-front',(x,.657,.48),(.96,.045,.73),M['teal'],.01)
    cylinder('cabinet-knob',(x+.33,.61,.71),.024,.055,M['brass'],(math.pi/2,0,0))
cube('sink-counter',(-4.92,.99,.927),(2.23,.94,.095),M['cream'])
cube('sink-dark-basin',(-5.3,.88,.982),(.65,.48,.008),M['dark'],.08)
for x in [-5.66,-4.94]:cube('sink-rim',(x,.89,.993),(.045,.55,.032),M['metal'],.012)
for y in [.61,1.16]:cube('sink-rim',(-5.3,y,.993),(.76,.045,.032),M['metal'],.012)
curve('faucet',[(-5.3,1.3,.98),(-5.3,1.3,1.31),(-5.3,1.21,1.4),(-5.3,1.02,1.4),(-5.3,.94,1.31)],.021,M['metal'])
cylinder('faucet-tap',(-5.08,1.3,1.04),.031,.13,M['metal'])
for j in range(4):cylinder('dirty-plate-stack',(-4.54,.93,.992+j*.017),.17,.021,M['cream'])
cylinder('tea-mug',(-4.2,1.05,1.043),.057,.13,M['cream'])
cube('dish-towel',(-4.08,.73,.99),(.25,.4,.017),M['linen'],.008)
for x in [-5.4,-4.4]:
    cube('upper-cupboard',(x,1.37,2.34),(.95,.49,.61),M['teal'])
    cube('upper-cupboard-panel',(x,1.1,2.34),(.88,.05,.54),M['teal'])
    cylinder('upper-cupboard-knob',(x+.28,1.06,2.17),.023,.05,M['brass'],(math.pi/2,0,0))
proxy('sink-cabinet',(-4.92,1.03,.49),(2.22,.78,.98))

# Stove and hood.
cube('stove-body',(-3.32,1.045,.455),(.78,.76,.90),M['cream'])
cube('oven-dark-window',(-3.32,.646,.39),(.52,.025,.36),M['dark'],.025)
cube('oven-handle',(-3.32,.594,.65),(.56,.055,.045),M['metal'])
cube('stove-top',(-3.32,1.015,.94),(.83,.82,.055),M['cream'])
for x in [-3.53,-3.1]:
    for y in [.81,1.21]:
        cylinder('gas-burner',(x,y,.979),.10,.032,M['dark'])
        for a in [0,math.pi/2]:o=cube('burner-grate',(x,y,1.001),(.28,.019,.014),M['dark'],.003);o.rotation_euler.z=a
for j in range(4):cylinder('stove-knob',(-3.58+j*.17,.636,.807),.032,.041,M['dark'],(math.pi/2,0,0))
cylinder('saucepan',(-3.11,1.18,1.07),.126,.15,M['metal'])
cube('saucepan-handle',(-2.9,1.18,1.09),(.24,.045,.04),M['dark'])
cube('hood-canopy',(-3.32,1.34,2.13),(1,.65,.22),M['cream'],.04)
cube('hood-chimney',(-3.32,1.46,2.53),(.32,.32,.64),M['cream'])
proxy('stove',(-3.32,1.045,.49),(.81,.79,.98))

# Fridge interior remains in baked art; its hinged leaf is runtime geometry.
cube('fridge-case',(-1.26,1.1,.91),(.9,.83,1.82),M['cream'],.045)
cube('fridge-cavity',(-1.26,.658,.95),(.76,.02,1.5),M['dark'],.025)
for z in [.32,.65,.99,1.36]:cube('fridge-shelf',(-1.26,.69,z),(.68,.37,.032),M['cream'],.005)
for x,z in [(-1.45,.4),(-1.1,.72),(-1.5,1.06)]:cylinder('jar',(x,.65,z),.07,.16,M['teal'])
fridge=empty('hinge-fridge',(-1.72,.61,.04))
cube('fridge-leaf',(.45,0,.88),(.88,.11,1.76),M['cream'],.035,'moving',fridge)
cube('fridge-handle',(.75,-.095,1.07),(.045,.06,.4),M['metal'],.01,'moving',fridge)
cube('freezer-seam',(.45,-.057,1.36),(.82,.012,.012),M['dark'],0,'moving',fridge)
proxy('fridge',(-1.26,1.15,.91),(.9,.70,1.82))

# Bed: readable wooden frame, shaped pillow and draped wine blanket.
cube('bed-base',(1.75,.8,.32),(2.12,1.13,.47),M['wood'],.025)
cube('mattress',(1.75,.8,.60),(2.04,1.10,.22),M['linen'],.085)
cube('headboard',(.72,.8,.76),(.10,1.2,.97),M['oak'])
cube('footboard',(2.78,.8,.40),(.09,1.18,.38),M['oak'])
o=cube('pillow',(1.02,.8,.765),(.47,.75,.18),M['linen'],.08);o.rotation_euler.y=-.08
# One cover: identical topology, UVs and material in its empty/occupied poses.
# Neither pose is painted into the backdrop, so the pattern never changes.
cloth=M['fabric'].copy();cloth.name='woven-wine-cover'
nodes=cloth.node_tree.nodes;links=cloth.node_tree.links;bsdf=nodes.get('Principled BSDF')
base=bsdf.inputs['Base Color'].links[0].from_socket
uv=nodes.new('ShaderNodeTexCoord');sep=nodes.new('ShaderNodeSeparateXYZ');links.new(uv.outputs['UV'],sep.inputs[0])
stripe=None
for center in [.09,.125,.84,.875]:
    sub=nodes.new('ShaderNodeMath');sub.operation='SUBTRACT';sub.inputs[1].default_value=center;links.new(sep.outputs['X'],sub.inputs[0])
    absolute=nodes.new('ShaderNodeMath');absolute.operation='ABSOLUTE';links.new(sub.outputs[0],absolute.inputs[0])
    less=nodes.new('ShaderNodeMath');less.operation='LESS_THAN';less.inputs[1].default_value=.006;links.new(absolute.outputs[0],less.inputs[0])
    if stripe is None:stripe=less.outputs[0]
    else:
        combine=nodes.new('ShaderNodeMath');combine.operation='MAXIMUM';links.new(stripe,combine.inputs[0]);links.new(less.outputs[0],combine.inputs[1]);stripe=combine.outputs[0]
mix=nodes.new('ShaderNodeMixRGB');links.new(stripe,mix.inputs[0]);links.new(base,mix.inputs[1]);mix.inputs[2].default_value=(.34,.23,.12,1);links.new(mix.outputs[0],bsdf.inputs['Base Color'])
nx=40;ny=28;faces=[]
sleep_envelope=json.loads(subprocess.check_output(['node',os.path.join(ROOT,'tools','measure-sleep-cover.mjs')],cwd=ROOT,text=True,env={**os.environ,'APARTMENT_ASSETS_DIR':OUT}))
for ix in range(nx):
    for iy in range(ny):
        a=ix*(ny+1)+iy;faces.append((a,a+ny+1,a+ny+2,a+1))
def cover(name,occupied):
    verts=[]
    for ix in range(nx+1):
        x=1.29+1.53*ix/nx
        for iy in range(ny+1):
            y=[.16,.18,.205][iy] if iy<3 else .25+(1.395-.25)*(iy-3)/(ny-3)
            front=[1,.43,0][iy] if iy<3 else 0;rear=max(0,1-(1.395-y)/.055)
            edge=max(front,rear)
            z=.783-.225*front-.14*rear
            # Rounded shoulder, hip and knee volumes instead of a full-width board.
            shoulder=.278*math.exp(-((x-1.47)/.31)**2-((y-.84)/.24)**2)
            hip=.245*math.exp(-((x-1.94)/.30)**2-((y-.87)/.245)**2)
            knees=.218*math.exp(-((x-2.30)/.27)**2-((y-.69)/.265)**2)
            feet=.150*math.exp(-((x-2.64)/.23)**2-((y-.79)/.21)**2)
            if occupied:
                # Smooth soft union, with a waist hollow and asymmetrical bent legs.
                volumes=[shoulder,hip,knees,feet]
                z+=(sum(v**5 for v in volumes)**.2)*(1-edge)
                z=max(z,sleep_envelope[ix][iy]-.225*front-.14*rear)
                z+=.012*math.sin(x*18+y*23)*(1-edge)*min(1,(shoulder+hip+knees)*4)
            z+=.009*math.sin(x*24+y*17)*math.sin(y*12)*(1-edge)
            z+=(.012*math.sin(x*13)+.006*math.sin(x*28))*front
            verts.append((x,y,z))
    mesh=bpy.data.meshes.new(name+'-cloth');mesh.from_pydata(verts,[],faces);mesh.materials.append(cloth)
    uv_layer=mesh.uv_layers.new(name='ClothUV')
    for poly in mesh.polygons:
        poly.use_smooth=True
        for li in poly.loop_indices:
            vi=mesh.loops[li].vertex_index;uv_layer.data[li].uv=(vi//(ny+1)/nx,vi%(ny+1)/ny)
    obj=bpy.data.objects.new(name,mesh);scene.collection.objects.link(obj);moving.append(obj)
    return obj
bed_cover=cover('bed-cover',False);blanket=cover('sleep-blanket',True)
for x in [1.2,2.2]:
    cube('bed-drawer',(x,.2,.32),(.86,.03,.25),M['oak'],.007)
    cube('bed-drawer-pull',(x,.167,.34),(.20,.035,.025),M['dark'],.009)
proxy('bed-base',(1.75,.8,.39),(2.12,1.13,.64))
proxy('bed-footboard',(2.78,.8,.4),(.1,1.18,.4))

# Desk dimensions share the mannequin's seated pose.
cube('desk-top',(4.70,.88,.785),(1.92,.82,.085),M['oak'],.022)
for x in [3.87,5.54]:
    for y in [.57,1.20]:cube('desk-leg',(x,y,.375),(.065,.065,.75),M['wood'],.01)
cube('drawer-pedestal',(5.22,.94,.38),(.57,.65,.70),M['wood'])
for z in [.18,.4,.62]:
    cube('desk-drawer',(5.22,.589,z),(.51,.048,.18),M['oak'],.008)
    cube('desk-pull',(5.22,.55,z+.02),(.14,.035,.022),M['dark'])
cube('crt-case',(4.63,1.045,1.12),(.63,.42,.52),M['plastic'],.05)
cube('crt-bezel',(4.63,.815,1.14),(.56,.05,.40),M['plastic'],.025)
screen=material('phosphor-blue',(.058,.12,.20));bs=screen.node_tree.nodes.get('Principled BSDF');bs.inputs['Emission Color'].default_value=(.07,.18,.32,1);bs.inputs['Emission Strength'].default_value=.6
cube('crt-glass',(4.63,.784,1.145),(.465,.014,.315),screen,.02)
for i in range(4):cube('screen-text',(4.54,.774,1.23-i*.04),(.20+i*.025,.001,.006),M['teal'],0)
cube('crt-stand',(4.63,1.05,.85),(.28,.27,.1),M['plastic'])
cube('keyboard',(4.48,.565,.851),(.59,.20,.035),M['plastic'],.008)
for row in range(4):
    for col in range(12):cube('key',(4.22+col*.046,.491+row*.045,.874),(.037,.031,.008),M['cream'],.002)
o=cube('mouse',(4.91,.54,.866),(.075,.12,.04),M['plastic'],.021)
curve('mouse-cable',[(4.91,.60,.87),(5,.8,.836),(4.8,1.19,.83)],.005,M['dark'])
cylinder('desk-mug',(5.36,.91,.89),.061,.14,M['cream'])
cylinder('microphone-base',(5.12,1.12,.854),.083,.031,M['dark'])
cylinder('microphone-stand',(5.12,1.12,1.005),.014,.28,M['metal'])
cylinder('microphone-capsule',(5.12,1.1,1.18),.036,.13,M['dark'])
chair=empty('chair-root',(0,0,0))
cube('chair-seat',(4.48,.02,.38),(.48,.46,.07),M['wood'],.022,'moving',chair)
cube('chair-pad',(4.48,.02,.425),(.45,.43,.04),M['teal'],.026,'moving',chair)
for dx in [-.19,.19]:
    for y in [-.16,.19]:cube('chair-leg',(4.48+dx,y,.195),(.043,.043,.39),M['wood'],.01,'moving',chair)
for dx in [-.19,.19]:cube('chair-upright',(4.48+dx,-.19,.71),(.05,.06,.67),M['wood'],.012,'moving',chair)
cube('chair-backrest',(4.48,-.19,.86),(.46,.06,.21),M['oak'],.015,'moving',chair)
proxy('desk-top',(4.70,.88,.785),(1.92,.82,.085))
proxy('desk-drawer',(5.22,.94,.38),(.57,.65,.70))
proxy('crt',(4.63,1.045,1.12),(.63,.42,.52))

# The deep CRT must stand in front of the sill, never intersect it.
for obj in static+proxies:
    if obj.name.startswith(('crt-','screen-text','depth-crt')):
        obj.location.y-=.21
        obj.location.z+=.0175 if obj.name.startswith('crt-stand') else .045

# Two actual hinged doors. The middle doorway cuts through the side partition.
cube('partition-rear',(0,.77,1.46),(.16,1.90,2.94),M['plaster'])
cube('partition-front',(0,-1.50,1.46),(.16,.50,2.94),M['plaster'])
cube('partition-lintel',(0,-.70,2.57),(.22,1.18,.78),M['plaster'])
passage_frame=empty('passage-frame-root',(0,0,0))
cube('passage-jamb-front',(0,-1.235,1.07),(.23,.065,2.14),M['wood'],.006,'moving',passage_frame)
cube('passage-jamb-rear',(0,-.165,1.07),(.23,.065,2.14),M['wood'],.006,'moving',passage_frame)
cube('passage-jamb-header',(0,-.70,2.155),(.23,1.14,.065),M['wood'],.006,'moving',passage_frame)
for face in [-1,1]:
    for y in [-1.255,-.145]:cube('passage-wall-trim',(face*.128,y,1.10),(.035,.105,2.20),M['oak'],.007,'moving',passage_frame)
    cube('passage-wall-header',(face*.128,-.70,2.20),(.035,1.215,.105),M['oak'],.007,'moving',passage_frame)
door=empty('hinge-passage',(0,-.20,.02))
cube('passage-leaf',(0,-.50,1.04),(.062,1.0,2.08),M['wood'],.015,'moving',door)
for face in [-1,1]:
    for z in [.55,1.51]:cube('passage-panel',(face*.037,-.50,z),(.018,.79,.7),M['oak'],.009,'moving',door)
    cylinder('passage-handle',(face*.09,-.86,1.04),.026,.10,M['brass'],(0,math.pi/2,0),'moving',door)
for name,z in [('lower',.37),('upper',1.73)]:cylinder('passage-hinge-'+name,(0,0,z),.025,.13,M['metal'],kind='moving',parent=door)
proxy('middle-wall',(0,.77,1.46),(.16,1.90,2.94))
proxy('middle-front-wall',(0,-1.50,1.46),(.16,.50,2.94))
entry_assembly_before=set(scene.objects)
entry=empty('hinge-entry',(6.5,-.15,.015))
for y in [-1.23,-.12]:cube('entry-frame',(6.46,y,1.08),(.22,.09,2.20),M['wood'])
cube('entry-lintel',(6.46,-.675,2.19),(.22,1.2,.08),M['wood'])
cube('entry-threshold',(6.5,-.675,.025),(.26,1.1,.04),M['metal'])
cube('entry-leaf',(0,-.52,1.06),(.075,1.04,2.12),M['wood'],.012,'moving',entry)
for z in [.58,1.56]:cube('entry-raised-panel',(-.049,-.52,z),(.027,.86,.79),M['oak'],.01,'moving',entry)
cylinder('entry-handle',(-.09,-.89,1.02),.035,.07,M['brass'],(0,math.pi/2,0),'moving',entry)
cylinder('peephole',(-.058,-.52,1.63),.014,.02,M['metal'],(0,math.pi/2,0),'moving',entry)
proxy('entry-rear-wall',(6.5,.785,1.47),(.14,1.87,3))
proxy('entry-front-wall',(6.5,-1.475,1.47),(.14,.55,3))
proxy('entry-lintel',(6.5,-.675,2.59),(.14,1.05,.76))

# Actual landing, visible only through the side doorway or the peephole camera.
# Every prop is exported, including the screening wall that conceals the landing
# from the apartment's cutaway camera.
landing=empty('landing-root',(0,0,0))
landing_green=material('landing-old-green-oil-paint',(.047,.076,.058),(.12,.17,.10),12)
landing_plaster=material('landing-smoke-stained-plaster',(.17,.16,.12),(.32,.30,.24),14)
def hall_cube(name,loc,size,mat,bevel=.012):
    return cube('landing-'+name,loc,size,mat,bevel,'moving',landing)
hall_cube('floor',(7.88,0,-.04),(2.60,3.50,.12),M['grout'])
for ix in range(5):
    for iy in range(7):hall_cube('terrazzo-tile',(6.85+ix*.5,-1.5+iy*.5,.025),(.49,.49,.025),M['tileblack' if (ix+iy)%2 else 'tilewhite'],.002)
hall_cube('far-wall',(9.16,0,1.5),(.14,3.5,3.0),landing_plaster)
hall_cube('far-wall-green',(9.075,0,.61),(.025,3.5,1.22),landing_green)
hall_cube('rear-wall',(7.87,1.74,1.5),(2.65,.14,3.0),landing_plaster)
hall_cube('rear-wall-green',(7.87,1.655,.61),(2.65,.025,1.22),landing_green)
hall_cube('front-screen',(7.87,-1.74,1.5),(2.65,.14,3.0),M['dark'])
landing_ceiling=material('landing-ceiling-grey-plaster',(.22,.225,.20),(.39,.40,.355),12)
hall_cube('ceiling',(7.88,0,3.05),(2.64,3.50,.10),landing_ceiling)
hall_cube('neighbour-door',(9.057,.42,1.04),(.07,.89,2.08),M['wood'])
for y in [-.06,.90]:hall_cube('neighbour-frame',(9.01,y,1.08),(.12,.07,2.16),M['oak'])
hall_cube('neighbour-lintel',(9.01,.42,2.15),(.12,1.02,.07),M['oak'])
for z in [.58,1.48]:hall_cube('neighbour-panel',(9.01,.42,z),(.035,.73,.69),M['oak'])
hall_cube('neighbour-number-plate',(8.974,.42,1.84),(.018,.16,.09),M['brass'])
hall_cube('doormat',(8.66,.42,.047),(.52,.71,.018),M['fabric'])
hall_cube('mailbox-bank',(7.48,1.60,1.47),(1.05,.12,.56),M['teal'])
for i in range(3):
    hall_cube('mailbox-face',(7.14+i*.34,1.526,1.47),(.32,.025,.51),M['teal'])
    hall_cube('mailbox-slot',(7.14+i*.34,1.506,1.62),(.21,.014,.018),M['dark'],.002)
    hall_cube('mailbox-label',(7.14+i*.34,1.506,1.38),(.09,.015,.038),M['paper'],.001)
hall_cube('switch',(8.98,-.48,1.1),(.04,.072,.09),M['plastic'])
hall_cube('lamp-backplate',(9.015,-.48,2.53),(.10,.23,.27),M['metal'])
hall_cube('lamp-frosted-glass',(8.95,-.48,2.53),(.12,.19,.22),M['cream'],.045)
area('dim-landing-light',(8.85,-.44,2.42),(7.7,.1,.5),28,(1,.69,.36),.45)
for obj in set(scene.objects)-entry_assembly_before:
    if obj.parent is None:obj.location.x+=right-6.5

# The living face of the partition carries the same wallpaper as its room.
for name,loc,size in [('rear',(0.083,.77,1.46),(.004,1.90,2.94)),('front',(0.083,-1.50,1.46),(.004,.50,2.94)),('lintel',(0.113,-.70,2.57),(.004,1.18,.78))]:
    cube('partition-living-paper-'+name,loc,size,M['wall'],0)

# Details at a readable density: pipes, radiator, sockets, book stack, old light.
curve('heating-pipe',[(-6.34,1.56,.12),(-6.34,1.56,2.82),(-3.34,1.56,2.82)],.022,M['cream'])
for rx in [2.65,4.55]:
    for i in range(9):cube('radiator-section',(rx-.44+i*.11,1.535,.46),(.083,.20,.55),M['cream'],.033)
    curve('radiator-pipe',[(rx-.5,1.535,.30),(rx-.61,1.535,.30),(rx-.61,1.535,.1)],.015,M['cream'])
for x in [-4,3.8,5.5]:
    cube('socket',(x,1.615,.31),(.084,.025,.09),M['cream'],.006)
    for dx in [-.018,.018]:cylinder('socket-hole',(x+dx,1.598,.31),.006,.004,M['dark'],(math.pi/2,0,0))
for i in range(3):cube('book-stack',(3.92,1.07,.85+i*.036),(.30,.25,.034),M['fabric' if i%2 else 'paper'],.002)
lamp_objects={};lamp_lights={}
for room,x in [('kitchen',-4.8),('living',4.05)]:
    curve('lamp-cord',[(x,.15,2.97),(x,.15,2.58)],.009,M['dark'])
    # Shallow pressed enamel reflector, rolled cream rim and bakelite socket.
    cylinder('lamp-bakelite-socket',(x,.15,2.58),.058,.14,M['dark'])
    shade_mat=material('lamp-worn-green-enamel',(.055,.089,.061),(.17,.22,.128),23,rough=.47)
    verts=[];faces=[]
    rings=[(2.56,.075),(2.545,.13),(2.51,.23),(2.47,.285),(2.445,.29)]
    for zz,rr in rings:
        for j in range(48):
            a=j*math.tau/48;verts.append((x+rr*math.cos(a),.15+rr*math.sin(a),zz))
    for k in range(len(rings)-1):
        for j in range(48):
            a=k*48+j;b=k*48+(j+1)%48;faces.append((a,b,b+48,a+48))
    mesh=bpy.data.meshes.new('pressed-enamel-shade');mesh.from_pydata(verts,[],faces);mesh.materials.append(shade_mat);mesh.materials.append(M['cream'])
    o=bpy.data.objects.new('soviet-enamel-pendant',mesh);scene.collection.objects.link(o);static.append(o)
    solid=o.modifiers.new('pressed-metal-thickness','SOLIDIFY');solid.thickness=.008;solid.material_offset=1
    curve('lamp-rolled-cream-rim',[(x+.29*math.cos(j*math.tau/64),.15+.29*math.sin(j*math.tau/64),2.446) for j in range(65)],.012,M['cream'])
    for a in [.35,2.5,4.7]:cube('lamp-enamel-chip',(x+.26*math.cos(a),.15+.26*math.sin(a),2.475),(.035,.022,.006),M['metal'],.003)
    bulb=material('lamp-'+room+'-bulb-glass',(.42,.40,.32));p=bulb.node_tree.nodes.get('Principled BSDF');p.inputs['Emission Color'].default_value=(1,.58,.19,1);p.inputs['Emission Strength'].default_value=3
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,radius=.075,location=(x,.15,2.40));o=bpy.context.object;o.name='lamp-'+room+'-bulb';o.data.materials.append(bulb);moving.append(o);lamp_objects[room]=o
    lamp_lights[room]=area('warm-ceiling-pool-'+room,(x,.1,2.37),(x,.1,.2),150,(1,.70,.39),.65)

switches=[]
for room,x in [('living',3.60),('kitchen',-.25)]:
    switch_root=empty('switch-'+room+'-root',(x,1.576,1.22));switches.append(switch_root)
    cube('switch-'+room+'-backplate',(0,0,0),(.135,.034,.16),M['plastic'],.012,'moving',switch_root)
    cube('switch-'+room+'-recess',(0,-.021,0),(.097,.014,.122),M['dark'],.007,'moving',switch_root)
    cube('switch-'+room+'-rocker',(0,-.034,0),(.085,.026,.110),M['cream'],.009,'moving',switch_root)
    for zz in [-.060,.060]:cylinder('switch-'+room+'-screw',(0,-.019,zz),.006,.007,M['metal'],(math.pi/2,0,0),'moving',switch_root)
area('soft-facade-fill',(0,-4,4),(0,0,1),190,(.46,.55,.71),8)
details=add_home_details(cube,cylinder,curve,material,M,scene,static,moving)
exterior=add_exterior(scene,dict(cube=cube,cylinder=cylinder,material=material),LAYOUT)
exterior_objects=exterior.pop('roots')
static[:]=[o for o in static if o not in exterior_objects]
matte=material('cutaway-surround-black',(0,0,0))
matte.node_tree.nodes.get('Principled BSDF').inputs['Specular IOR Level'].default_value=0
matte_start=len(static)
rear_piece('cutaway-surround',(1.5,2.02,1.35),(55,.03,35),matte,0)
cutaway_surround=static[matte_start:];del static[matte_start:]
area('exterior-overcast',(-8,18,28),(0,27,0),30000,(.73,.82,.91),28)

bpy.ops.object.camera_add(location=(1.5,-12,1.35+12*math.tan(math.radians(8))));camera=bpy.context.object;camera.name='camera-master';camera.data.type='ORTHO';camera.data.ortho_scale=20.8;aim(camera,(1.5,0,1.35));scene.camera=camera
scene.render.film_transparent=False
for o in proxies:o.hide_render=True;o.hide_set(True)
shell=add_first_person_shell(cube,M,LAYOUT)
import importlib.util
audit_spec=importlib.util.spec_from_file_location('apartment_audit',os.path.join(ROOT,'tools','audit-apartment-v3.py'))
audit_module=importlib.util.module_from_spec(audit_spec);audit_spec.loader.exec_module(audit_module)
audit=audit_module.audit_scene(scene,LAYOUT)
with open(os.path.join(OUT,'geometry-audit.json'),'w',encoding='utf8') as f:json.dump(audit,f,ensure_ascii=False,indent=2)
print('GEOMETRY_AUDIT',len(audit['errors']),'errors',len(audit['warnings']),'warnings',flush=True)
if '--audit-only' in sys.argv:
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SOURCE_OUT,'apartment-cutaway-v3.blend'))
    sys.exit(1 if audit['errors'] else 0)
if audit['errors']:raise ValueError('Geometry audit failed: '+str(audit['errors']))
export_geometry(scene,exterior_objects,os.path.join(OUT,exterior['geometry']),'outside-')
occlusion=[o for o in static if o.name.startswith(('rear-','left-return','right-return','partition-','window-','foundation','kitchen-floor-substrate','living-floor-substrate'))]
occlusion += [o for o in exterior_objects if o.name.endswith(('-body','-roof')) or o.name in ['exterior-courtyard-ground','exterior-factory-hall']]
occlusion += cutaway_surround
export_geometry(scene,occlusion,os.path.join(OUT,exterior['occluders']),'outside-mask-',False)

def prepare_backdrop_geometry():
    for o in static:o.hide_render=False
    for o in exterior_objects:o.hide_render=False
    for o in shell:o.hide_render=True
    for o in proxies:o.hide_render=True
    for o in moving:o.hide_render=not((o.parent==landing and o.name!='landing-ceiling') or o in lamp_objects.values())
prepare_backdrop_geometry()
source=os.path.join(SOURCE_OUT,'apartment-cutaway-v3.blend')
bpy.ops.wm.save_as_mainfile(filepath=source)

# Export exact occlusion geometry and door hinges in glTF's Y-up coordinates.
bpy.ops.object.select_all(action='DESELECT')
for o in proxies:o.hide_set(False);o.hide_render=False;o.select_set(True)
for o in moving:o.hide_render=False;o.hide_set(False);o.select_set(True)
live_roots=[door,entry,fridge,landing,chair,passage_frame]+switches
for o in live_roots:o.select_set(True)
# glTF cannot carry Blender's procedural nodes. Bake their actual base colour
# into UV textures instead of silently replacing every door with a flat colour.
scene.cycles.samples=8
for obj in static+moving+proxies:obj.hide_render=True
for o in moving:
    if o==blanket:continue
    o.hide_render=False
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
    if o!=bed_cover:
        bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.uv.smart_project(island_margin=.035);bpy.ops.object.mode_set(mode='OBJECT')
    mat=o.data.materials[0].copy();o.data.materials[0]=mat
    size=512 if 'leaf' in o.name or o==bed_cover else 256
    img=bpy.data.images.new(o.name+'-surface',width=size,height=size,alpha=False)
    tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=img;mat.node_tree.nodes.active=tex
    bpy.ops.object.bake(type='DIFFUSE',pass_filter={'COLOR'},margin=8)
    img.pack()
    bsdf=mat.node_tree.nodes.get('Principled BSDF')
    for socket in ['Base Color','Normal']:
        for link in list(bsdf.inputs[socket].links):mat.node_tree.links.remove(link)
    mat.node_tree.links.new(tex.outputs['Color'],bsdf.inputs['Base Color'])
    o.hide_render=True
blanket.data.materials[0]=bed_cover.data.materials[0]
bpy.ops.object.select_all(action='DESELECT')
for o in proxies+moving+live_roots:o.hide_render=False;o.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'interaction.glb'),export_format='GLB',use_selection=True,export_apply=True,export_animations=False,export_cameras=False,export_lights=False)

def xyz(p):return [p[0],p[2],-p[1]]
def action(label,x,pose,yaw,clip='work',fade=False,duration=6,hit=None):
    return dict(label=label,approach=[x,0,.85],pose=xyz(pose),yaw=yaw,clip=clip,fade=fade,duration=duration,hit=hit)
actions={
 'computer':action('Сесть за компьютер',4.48,(4.48,.02,.045),math.pi,'seated',True,10,[[4.45,1.12,-.83],[1.25,.82,.7]]),
 'bed':action('Лечь спать',1.75,(1.84,.8,.95),math.pi/2,'sleep',True,7,[[1.75,.60,-.8],[2.10,.58,1.12]]),
 'sink':action('Помыть посуду',-5.3,(-5.3,.29,0),math.pi,'wash',False,7,[[-5.3,.96,-.88],[1.05,.65,.75]]),
 'stove':action('Приготовить еду',-3.32,(-3.32,.25,0),math.pi,'wash',False,7,[[-3.32,.77,-1.0],[.82,1.04,.82]]),
 'fridge':action('Открыть холодильник',-1.26,(-1.26,.05,0),math.pi,'reach',False,5,[[-1.26,.91,-.7],[.93,1.82,.73]]),
 'entry':action('Выйти из квартиры',5.98,(6.04,-.675,0),math.pi/2,'open-door',False,3,[[6.50,1.07,.675],[.25,2.13,1.10]]),
 'passage':dict(label='Перейти в другую комнату',crossRoom=True,hit=[[0,1.06,.50],[.35,2.12,1.64]]),
}
for room,actor_x,switch_x in [('living',3.35,3.60),('kitchen',-.50,-.25)]:
    a=action('Выключатель света',actor_x,(actor_x,1.10,0),math.pi,'switch',False,.7,[[switch_x,1.22,-1.576],[.23,.24,.16]])
    a.update(lightRoom=room,contactTime=.32);actions['light-'+room]=a
manifest=dict(version=3,bounds=[-6.1,6.15],spawn=[3.4,0,.85],speed=1.326,doorX=0,doorSweep=[-.4,1.35],passageOpenAngle=math.pi*.52,background='background.png',backgroundDay='background-day.png',geometry='interaction.glb',camera=dict(position=xyz(camera.location),target=[.85,1.35,0],width=16.8,height=6.72),actions=actions,rig='mannequin.glb',stride=.90,entryExit=dict(position=[8.35,0,.675],yaw=math.pi/2),entryDoor=dict(hinge=[6.5,.015,.15],openAngle=math.pi/2,threshold=6.55,closedBounds=6.15),clock=details['clock'],backgroundResolution=[3840,1536],landing=dict(root='landing-root'),peepholeCamera=dict(position=[6.61,1.645,.675],target=[9.05,1.51,-.15]))
lighting_states=LIGHTING_STATES
manifest.update(motion_config(LAYOUT))
manifest['exterior']=exterior
manifest['camera']=dict(position=xyz(camera.location),target=[1.5,1.35,0],width=20.8,height=8.32)
manifest.update(lightingStates=lighting_states,liveRoots=[o.name for o in live_roots],lampFixtures={room:dict(bulb=o.name,position=xyz(o.location),lightPosition=xyz(lamp_lights[room].location),bakedBulb=True) for room,o in lamp_objects.items()})
with open(os.path.join(OUT,'scene.json'),'w',encoding='utf8') as f:json.dump(manifest,f,ensure_ascii=False,indent=2)
print('V3_APARTMENT_GEOMETRY_READY',OUT,flush=True)

if '--export-only' not in sys.argv:
    prepare_backdrop_geometry();scene.cycles.samples=48
    manifest['cameraViews']=camera_views(scene,camera,OUT,render_light_states)
    manifest['camera']=manifest['cameraViews']['2D']
    for obj in static+moving+proxies:obj.hide_render=True
    scene.cycles.samples=8
    shell=export_static(scene,static,cube,M,OUT)
    manifest['staticGeometry']='static.glb'
    with open(os.path.join(OUT,'scene.json'),'w',encoding='utf8') as f:json.dump(manifest,f,ensure_ascii=False,indent=2)
    prepare_backdrop_geometry()
    for obj in shell:obj.hide_render=True
    camera.location=(1.5,-12,1.35+12*math.tan(math.radians(8)));aim(camera,(1.5,0,1.35))
    bpy.ops.wm.save_as_mainfile(filepath=source)
print('V3_APARTMENT_READY',OUT,flush=True)
