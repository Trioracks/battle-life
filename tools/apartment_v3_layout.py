"""Shared metre-scale layout, in runtime (X right, Y up, Z toward viewer)."""
import copy
import json
import math
import argparse
from pathlib import Path


def load_layout(path=None):
    with open(path or Path(__file__).with_name('apartment-v3-layout.json'), encoding='utf8') as source:
        return json.load(source)


def to_blender(position):
    return position[0], -position[2], position[1]


def output_paths(argv, root):
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument('--out', default=str(Path(root)/'assets/apartment/v3'))
    parser.add_argument('--source-out', default=str(Path(root)/'assets/source'))
    args, _ = parser.parse_known_args(argv[argv.index('--')+1:] if '--' in argv else [])
    paths = [Path(args.out), Path(args.source_out)]
    for path in paths:
        if not path.is_absolute():
            raise ValueError('Build output must be an absolute path: '+str(path))
        path.mkdir(parents=True, exist_ok=True)
    return tuple(str(path.resolve()) for path in paths)


def motion_config(layout):
    anchors = layout['anchors']
    actions = copy.deepcopy(anchors['actions'])
    for action in actions.values():
        action['approach'] = [action.pop('x'), 0, layout['railZ']]
    actions['passage'] = dict(label='Перейти в другую комнату', crossRoom=True,
                              hit=[[0, 1.06, .50], [.35, 2.12, 1.64]])
    return dict(layout=copy.deepcopy(layout), bounds=[layout['rooms']['kitchen']['x'][0]+.4,
                layout['rooms']['living']['x'][1]-.35], spawn=anchors['spawn'],
                speed=1.326, stride=.9, doorX=0, doorSweep=[-.4, 1.35],
                passageOpenAngle=math.pi*.52, actions=actions,
                entryDoor=dict(hinge=anchors['entryHinge'], openAngle=math.pi/2,
                               threshold=anchors['entryHinge'][0]+.05,
                               closedBounds=anchors['entryHinge'][0]-.35),
                entryExit=dict(position=anchors['entryExit'], yaw=math.pi/2),
                peepholeCamera=dict(position=anchors['peepholeEye'], target=anchors['peepholeTarget']))


if __name__ == '__main__':
    print(json.dumps(motion_config(load_layout()), ensure_ascii=True))
