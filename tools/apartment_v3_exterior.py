"""Shared, fully volumetric Soviet courtyard; no window-mounted picture cards."""
from apartment_v3_layout import to_blender


def add_exterior(scene, factories, layout):
    cube, cylinder, material = (factories[k] for k in ['cube', 'cylinder', 'material'])
    roots, buildings, emitters = [], [], []
    concrete=material('exterior-concrete',(.30,.32,.29))
    panels=material('exterior-panel-seams',(.15,.17,.16))
    roof=material('exterior-tar-roof',(.065,.074,.073))
    glass=material('exterior-window-glass',(.09,.16,.19))
    lit=material('exterior-window-lights',(.70,.47,.20))
    brick=material('exterior-factory-brick',(.24,.13,.09))
    asphalt=material('exterior-asphalt',(.14,.16,.14))
    grass=material('exterior-winter-grass',(.20,.22,.13))

    def box(name,p,size,mat):
        o=cube(name,to_blender(p),(size[0],size[2],size[1]),mat,.01)
        roots.append(o);return o

    box('exterior-courtyard-ground',[0,-4.6,-55],[140,.2,115],asphalt)
    box('exterior-grass-verge',[0,-4.48,-8],[34,.04,5],grass)
    for bid,cx,depth,width in [('block-west',-10,24,18),('block-east',12,36,21)]:
        bottom=-4.5;height=14.5;front=-depth+4.5
        box(bid+'-body',[cx,bottom+height/2,-depth],[width,height,9],concrete)
        box(bid+'-roof',[cx,bottom+height+.13,-depth],[width+.5,.26,9.5],roof)
        box(bid+'-foundation',[cx,bottom+.35,-depth],[width+.12,.7,9.12],panels)
        for row in range(5):
            y=bottom+1.65+row*2.85
            box(bid+'-storey-joint-'+str(row),[cx,y+1.35,front+.014],[width,.065,.028],panels)
            for col in range(7):
                x=cx-width/2+1.45+col*(width-2.9)/6
                label=bid+'-window-row-'+str(row)+'-'+str(col)
                box(label+'-frame',[x,y,front+.035],[1.42,1.65,.08],panels)
                box(label,[x,y,front+.081],[1.21,1.44,.015],glass)
                box(label+'-mullion',[x,y,front+.102],[.055,1.46,.03],concrete)
                if (col*3+row*5)%7<3:
                    box('exterior-lit-'+label,[x-.3,y,front+.099],[.49,1.3,.012],lit)
            for side in [-1,1]:
                for slot in [-2,1.5]:
                    box(bid+'-side-window',[cx+side*(width/2+.025),y,-depth+slot],[.06,1.4,1.05],glass)
        for col in range(8):box(bid+'-panel-joint',[cx-width/2+col*width/7,2.75,front+.021],[.04,14.4,.024],panels)
        entrance=cx-width/2+1.45+2.5*(width-2.9)/6
        box(bid+'-entrance-door',[entrance,bottom+1.02,front+.06],[1.03,2.04,.12],roof)
        box(bid+'-entrance-canopy',[entrance,bottom+2.22,front+.50],[1.50,.14,1.1],concrete)
        box(bid+'-entrance-step',[entrance,bottom+.1,front+.45],[1.40,.2,.85],panels)
        for row in range(1,5):
            y=bottom+1.65+row*2.85
            for col in [1,5]:
                x=cx-width/2+1.45+col*(width-2.9)/6
                box(bid+'-balcony-slab',[x,y-.83,front+.57],[1.75,.13,1.14],concrete)
                box(bid+'-balcony-front',[x,y-.30,front+1.1],[1.75,.95,.065],panels)
                for side in [-1,1]:box(bid+'-balcony-side',[x+side*.84,y-.30,front+.57],[.065,.95,1.1],panels)
        buildings.append(dict(id=bid,floors=5,bounds=dict(min=[cx-width/2,bottom,-depth-4.5],max=[cx+width/2,bottom+height,-depth+4.5])))

    box('exterior-factory-hall',[0,-.4,-77],[43,8.2,19],brick)
    box('exterior-factory-roof',[0,3.8,-77],[44,.25,20],roof)
    for x in range(-19,21,4):box('exterior-factory-window',[x,1,-67.45],[2.5,2,.09],glass)
    for name,x,z,height in [('factory-stack-west',-8,-75,24.5),('factory-stack-east',8,-82,28.5)]:
        p=[x,-4.5+height/2,z]
        roots.append(cylinder(name,to_blender(p),1.05,height,brick))
        box(name+'-cap',[x,-4.5+height,z],[2.35,.3,2.35],roof)
        emitters.append(dict(id=name,position=[x,-4.5+height,z],seed=14 if x<0 else 53))
    # Pavement and benches establish scale below the second-floor windows.
    for x in [-5,4]:
        box('exterior-bench-seat',[x,-3.85,-9],[2,.12,.50],roof)
        for side in [-.75,.75]:box('exterior-bench-leg',[x+side,-4.17,-9],[.09,.64,.42],panels)
    return dict(roots=roots,geometry='exterior.glb',occluders='exterior-occluders.glb',
                buildings=buildings,emitters=emitters,farPlane=200)


def export_geometry(scene, objects, path, prefix, material_groups=True):
    """Join copies only, keeping authored objects and audit identities intact."""
    import bpy
    groups={}
    for obj in objects:
        if obj.type not in {'MESH','CURVE','FONT'}:continue
        key=obj.data.materials[0].name if material_groups and obj.data.materials else 'depth'
        groups.setdefault(key,[]).append(obj)
    exports=[]
    for name,group in groups.items():
        bpy.ops.object.select_all(action='DESELECT');copies=[]
        for obj in group:
            copy=obj.copy();copy.data=obj.data.copy();scene.collection.objects.link(copy)
            # Apply each original world transform before removing parent links.
            world=obj.matrix_world.copy();copy.parent=None;copy.matrix_world=world
            copy.hide_set(False);copy.hide_render=False;copy.select_set(True);copies.append(copy)
        bpy.context.view_layer.objects.active=copies[0];bpy.ops.object.convert(target='MESH');bpy.ops.object.join()
        obj=bpy.context.object;obj.name=prefix+name
        if not material_groups:obj.data.materials.clear()
        exports.append(obj)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in exports:obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path,export_format='GLB',use_selection=True,export_apply=True,export_animations=False,export_cameras=False,export_lights=False)
    for obj in exports:bpy.data.objects.remove(obj,do_unlink=True)
