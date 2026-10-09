"""Persistent export ownership, with name fallback for existing authored files."""
def is_interior_static(obj,dynamic):
    if obj.type not in {'MESH','CURVE'} or obj.name in dynamic:return False
    if getattr(obj,'get',lambda key:None)('apartment_role') in {'exterior','cutaway-mask','computer-live'}:return False
    return not obj.name.startswith(('depth-','exterior-','block-west','block-east','factory-stack-','cutaway-surround'))
