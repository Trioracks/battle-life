"""Inspection renders of authored geometry, not screenshots of the running game."""
import bpy, os, math
from mathutils import Vector

out='D:/Codex/Builds/Battle/apartment-v12/qa'
os.makedirs(out,exist_ok=True)
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=24
scene.render.resolution_x=1280;scene.render.resolution_y=720;scene.render.resolution_percentage=100
for obj in scene.objects:
    if obj.name.startswith(('depth-','cutaway-surround','sleep-blanket')):obj.hide_render=True
    elif obj.type in {'MESH','CURVE'}:obj.hide_render=False
for obj in scene.objects:
    if obj.name.startswith('landing-'):obj.hide_render=True
camera=scene.camera;camera.data.type='PERSP';camera.data.lens=23;camera.data.clip_end=200
for name,position,target in [
    ('living-workstation',(3.4,-.85,1.63),(4.48,1.12,1.0)),
    ('living-front',(4.7,.85,1.63),(3.4,-1.7,1.5)),
    ('kitchen-dining',(-5.8,-.85,1.63),(-7.25,1.1,.8)),
    ('courtyard',(2.65,.4,1.63),(6,29,3)),
]:
    camera.location=position;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=os.path.join(out,name+'.png');bpy.ops.render.render(write_still=True)
print('QA_RENDERS_READY',out)
