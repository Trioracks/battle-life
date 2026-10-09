"""Repeatable inspection views of the actual authored, skinned Blender model."""
import bpy, os, math
from mathutils import Vector

ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT='D:/Codex/Temp/avatar-v3-review';os.makedirs(OUT,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=os.path.join(ROOT,'assets/source/mannequin-v3.blend'))
scene=bpy.context.scene;rig=bpy.data.objects['mannequin-rig']
scene.render.engine='BLENDER_EEVEE_NEXT';scene.render.resolution_x=640;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.world.color=(.16,.16,.16);scene.view_settings.view_transform='AgX'
scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
bpy.ops.object.camera_add(location=(2.7,-6,2.4));camera=bpy.context.object;scene.camera=camera
camera.data.type='ORTHO';camera.data.ortho_scale=2.06
def aim(o,target):o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
for position,power,size in [((-3,-4,5),600,5),((3,-1,3),400,4),((0,3,4),650,3)]:
    bpy.ops.object.light_add(type='AREA',location=position);lamp=bpy.context.object;lamp.data.energy=power;lamp.data.shape='DISK';lamp.data.size=size;aim(lamp,(0,0,1))
def look(top,bottom,beard='none'):
    selected={'look-hair-crop','look-face-oval','look-top-'+top,'look-bottom-'+bottom,'look-footwear-sneakers','look-beard-'+beard}
    for o in bpy.data.objects:
        if o.name.startswith('look-'):o.hide_render=o.name not in selected
def render(name,angle):
    camera.location=(6*math.sin(angle),-6*math.cos(angle),1.66);aim(camera,(0,0,.92));scene.render.filepath=os.path.join(OUT,name+'.png');bpy.ops.render.render(write_still=True)
look('tee','shorts','stubble');scene.frame_set(1)
render('tee-shorts-front',0);render('tee-shorts-threequarter',.55)
look('shirt','jeans');render('shirt-jeans-back',math.pi);render('shirt-jeans-front',0)
for track in rig.animation_data.nla_tracks:track.mute=track.name!='walk'
look('tee','jeans');scene.frame_set(9);render('walk-support',.8)
for track in rig.animation_data.nla_tracks:track.mute=track.name!='idle'
look('tee','shorts','full');scene.frame_set(1)
camera.data.ortho_scale=.57
for name,angle in [('full-beard-front',0),('full-beard-threequarter',.68),('full-beard-profile',math.pi/2)]:
    camera.location=(6*math.sin(angle),-6*math.cos(angle),1.65);aim(camera,(0,0,1.65))
    scene.render.filepath=os.path.join(OUT,name+'.png');bpy.ops.render.render(write_still=True)
print('AVATAR_PREVIEW_READY '+OUT)
