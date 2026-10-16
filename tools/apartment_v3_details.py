"""Small, static domestic details for the authored v3 apartment.

Domestic props are baked into the room image. Only the silent clock hands are
exported independently to show game time. Coordinates are Blender Z-up.
"""
import math
import bpy


def add_home_details(cube, cylinder, curve, material, M, scene, static, moving):
    """Add a restrained Soviet home palette using the builder's own helpers."""
    start = len(static)
    walnut = material('home-clock-carved-walnut', (.082, .039, .016),
                      (.25, .125, .044), 7, wood=True)
    relief = material('home-clock-polished-relief', (.17, .079, .027),
                      (.36, .19, .073), 8, wood=True)
    dial = material('home-clock-ebonised-dial', (.019, .021, .018),
                    (.048, .047, .034), 14)
    bone = material('home-clock-aged-ivory', (.55, .47, .29), None, rough=.65)
    terracotta = material('home-terracotta', (.16, .058, .029),
                           (.31, .14, .067), 17)
    foliage = material('home-dusty-leaves', (.038, .071, .026),
                        (.13, .19, .061), 14)
    leaf_lit = material('home-leaf-veins', (.18, .22, .083), None)
    rug = material('home-rug-faded-madder', (.092, .038, .029),
                   (.185, .081, .051), 105)
    rug_ochre = material('home-rug-ochre-thread', (.235, .174, .092),
                         (.34, .264, .149), 110)
    rug_dark = material('home-rug-charcoal-thread', (.044, .049, .035), None)
    towel = material('home-towel-unbleached-cotton', (.36, .34, .25),
                     (.53, .50, .39), 100)
    ink = material('home-notebook-blue-grey', (.044, .075, .073),
                   (.10, .14, .12), 40)
    photo_back = material('home-photo-sepia-paper', (.22, .185, .12),
                          (.35, .30, .205), 32)
    photo_dark = material('home-photo-sepia-shadow', (.073, .068, .046), None)
    photo_skin = material('home-photo-sepia-light', (.42, .36, .24), None)

    def mesh_object(name, verts, faces, mat):
        mesh = bpy.data.meshes.new(name)
        mesh.from_pydata(verts, [], faces)
        mesh.materials.append(mat)
        mesh.update()
        obj = bpy.data.objects.new(name, mesh)
        scene.collection.objects.link(obj)
        static.append(obj)
        return obj

    def relief_shape(name, outline, y, depth, mat):
        """A carved silhouette in the wall plane, with real shallow thickness."""
        n = len(outline)
        verts = [(x, y, z) for x, z in outline]
        verts += [(x, y + depth, z) for x, z in outline]
        faces = [tuple(reversed(range(n))), tuple(range(n, 2 * n))]
        faces += [(i, (i + 1) % n, (i + 1) % n + n, i + n)
                  for i in range(n)]
        obj = mesh_object(name, verts, faces, mat)
        bevel = obj.modifiers.new('small-carved-edge', 'BEVEL')
        bevel.width = .004
        bevel.segments = 2
        obj.modifiers.new('relief-normals', 'WEIGHTED_NORMAL')
        return obj

    def wall_leaf(name, x, y, z, length, width, angle, mat=relief):
        # Pointed serrated leaves read as woodworking, not round ornaments.
        ca, sa = math.cos(angle), math.sin(angle)
        profile = [(-.5, 0), (-.26, -.35), (-.15, -.5), (.04, -.40),
                   (.16, -.46), (.36, -.22), (.5, 0), (.28, .25),
                   (.15, .45), (-.04, .38), (-.18, .48), (-.30, .29)]
        outline = [(x + u * length * ca - v * width * sa,
                    z + u * length * sa + v * width * ca) for u, v in profile]
        obj = relief_shape(name, outline, y, .018, mat)
        curve(name + '-vein', [(x - .39 * length * ca, y - .005,
                               z - .39 * length * sa),
                              (x + .38 * length * ca, y - .005,
                               z + .38 * length * sa)], .0028, walnut)
        return obj

    def sphere(name, loc, scale, mat, segments=12, rings=6):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings,
                                           radius=1, location=loc)
        obj = bpy.context.object
        obj.name = name
        obj.scale = scale
        obj.data.materials.append(mat)
        for poly in obj.data.polygons:
            poly.use_smooth = True
        static.append(obj)
        return obj

    # A modest carved hut clock. Rear wall front is y=1.645, so the case projects
    # naturally into the room without intersecting the bed or the window.
    cx, cy, cz = 1.25, 1.435, 2.205
    cube('home-clock-case', (cx, cy + .052, cz), (.35, .15, .39), walnut, .018)
    relief_shape('home-clock-gabled-case',
                 [(cx - .205, 2.36), (cx, 2.585), (cx + .205, 2.36)],
                 cy - .015, .135, walnut)
    for side in [-1, 1]:
        o = cube('home-clock-overhanging-roof',
                 (cx + side * .135, cy + .012, 2.481),
                 (.348, .205, .042), walnut, .008)
        o.rotation_euler.y = side * .70
        # A wood grain notch below each eave, and tapering carved lower apron.
        cube('home-clock-eave-end', (cx + side * .265, cy + .008, 2.363),
             (.034, .2, .055), relief, .006)
    relief_shape('home-clock-lower-apron',
                 [(cx - .19, 2.065), (cx - .145, 1.995), (cx, 1.958),
                  (cx + .145, 1.995), (cx + .19, 2.065)],
                 cy - .013, .13, walnut)
    # The bird lives in a small dark opening, visibly part of the ornament.
    cube('home-clock-bird-opening', (cx, cy - .024, 2.435),
         (.078, .014, .083), M['dark'], .027)
    sphere('home-clock-carved-bird', (cx - .004, cy - .044, 2.427),
           (.022, .017, .015), relief)
    sphere('home-clock-bird-head', (cx + .014, cy - .045, 2.441),
           (.012, .012, .012), relief)
    relief_shape('home-clock-bird-beak',
                 [(cx + .021, 2.444), (cx + .036, 2.438), (cx + .022, 2.435)],
                 cy - .047, .014, bone)
    cube('home-clock-bird-perch', (cx, cy - .055, 2.401),
         (.085, .029, .011), relief, .003)
    # Face diameter 0.266m: the hands and four cardinal Roman numerals remain
    # legible while leaving enough timber around the dial for the leaf carving.
    face_z = 2.195
    cylinder('home-clock-face-rim', (cx, cy - .034, face_z), .149, .027,
             relief, (math.pi / 2, 0, 0))
    cylinder('home-clock-black-dial', (cx, cy - .052, face_z), .133, .013,
             dial, (math.pi / 2, 0, 0))
    for hour in range(12):
        if hour % 3 == 0:
            continue
        a = math.tau * hour / 12
        curve('home-clock-hour-tick',
              [(cx + math.sin(a) * .112, cy - .062, face_z + math.cos(a) * .112),
               (cx + math.sin(a) * .121, cy - .062, face_z + math.cos(a) * .121)],
              .0022, bone)
    for label, dx, dz in [('XII', 0, .101), ('III', .100, 0),
                          ('VI', 0, -.101), ('IX', -.100, 0)]:
        font = bpy.data.curves.new('home-clock-Roman-' + label, 'FONT')
        font.body = label
        font.size = .033
        font.align_x = 'CENTER'
        font.align_y = 'CENTER'
        font.extrude = .0005
        obj = bpy.data.objects.new('home-clock-Roman-' + label, font)
        scene.collection.objects.link(obj)
        obj.location = (cx + dx, cy - .065, face_z + dz)
        obj.rotation_euler.x = math.pi / 2
        obj.data.materials.append(bone)
        static.append(obj)
    # At local rotation zero the hands point to twelve; glTF maps Z-up to +Y.
    # Mesh vertices are offset from the origin so runtime rotates at the pin.
    for name, length, width, offset in [('clock-hour-hand', .066, .0082, .071),
                                        ('clock-minute-hand', .096, .0058, .077)]:
        hand = cube(name, (cx, cy - offset, face_z),
                    (width, .004, length), bone, .002, 'moving')
        for vertex in hand.data.vertices:
            vertex.co.z += length / 2
    cylinder('home-clock-hand-pin', (cx, cy - .074, face_z), .009, .007,
             M['brass'], (math.pi / 2, 0, 0))
    for side in [-1, 1]:
        wall_leaf('home-clock-carved-side-leaf', cx + side * .204, cy - .032,
                  2.245, .19, .092, side * .95)
        wall_leaf('home-clock-carved-upper-leaf', cx + side * .103, cy - .039,
                  2.524, .16, .073, side * .63)
        wall_leaf('home-clock-carved-apron-leaf', cx + side * .115, cy - .033,
                  2.019, .15, .067, -side * .28)
    # Closed, interleaved links distinguish chains from straight hanging rods.
    for chain_idx, (dx, bottom) in enumerate([(-.115, 1.635), (.115, 1.57)]):
        for link_idx in range(int((1.995 - bottom) / .020)):
            zz = 1.982 - link_idx * .020
            points = []
            for j in range(13):
                a = math.tau * j / 12
                if link_idx % 2:
                    points.append((cx + dx + math.cos(a) * .0035,
                                   cy + .009 + math.cos(a) * .006,
                                   zz + math.sin(a) * .013))
                else:
                    points.append((cx + dx + math.cos(a) * .008,
                                   cy + .009, zz + math.sin(a) * .013))
            curve('home-clock-weight-chain', points, .0018, M['brass'])
        weight_z = bottom - .084
        sphere('home-clock-pinecone-weight', (cx + dx, cy + .009, weight_z),
               (.034, .036, .092), walnut)
        for row in range(6):
            z = weight_z - .064 + row * .026
            ring_r = .030 * math.sin(math.pi * (row + 1) / 7)
            for j in range(7):
                a = math.tau * (j + .5 * (row % 2)) / 7
                # Individual overlapping scales make the cone silhouette.
                sphere('home-clock-pinecone-scale',
                       (cx + dx + ring_r * math.cos(a),
                        cy + .009 + ring_r * math.sin(a), z),
                       (.012, .011, .020), relief, 8, 4)
    curve('home-clock-pendulum-stem', [(cx, cy + .026, 1.982),
                                     (cx, cy + .026, 1.653)], .006, walnut)
    wall_leaf('home-clock-pendulum-leaf', cx, cy - .013, 1.648,
              .153, .095, math.pi / 2)

    # A small faded family portrait, surrounded by the original dark wallpaper.
    px, pz = .54, 1.79
    cube('home-family-photo-frame', (px, 1.562, pz), (.265, .055, .338),
         walnut, .009)
    cube('home-family-photo-mount', (px, 1.529, pz), (.225, .009, .296),
         M['paper'], .001)
    cube('home-family-photo-print', (px, 1.520, pz), (.188, .006, .250),
         photo_back, .001)
    for dx, zz, r, hh in [(-.050, 1.827, .026, .100),
                          (.047, 1.836, .027, .111),
                          (0, 1.765, .021, .069)]:
        sphere('home-family-photo-shoulders', (px + dx, 1.511, zz - hh * .58),
               (r * 1.55, .003, hh * .6), photo_dark)
        sphere('home-family-photo-head', (px + dx, 1.504, zz),
               (r, .004, r * 1.2), photo_skin)
        sphere('home-family-photo-hair', (px + dx, 1.499, zz + r * .54),
               (r * .96, .003, r * .61), photo_dark)
    curve('home-family-photo-hanging-wire', [(px - .09, 1.58, pz + .169),
                                            (px, 1.59, pz + .22),
                                            (px + .09, 1.58, pz + .169)],
          .0024, M['dark'])

    # Desk edge remains free for the seated hands; objects occupy the side gaps.
    cube('home-exercise-book-pages', (4.045, .68, .842), (.25, .27, .028),
         M['paper'], .003)
    cube('home-exercise-book-cover', (4.045, .68, .858), (.26, .28, .007),
         ink, .002)
    cube('home-exercise-book-label', (4.045, .67, .862), (.14, .072, .0018),
         M['paper'], .001)
    for z in [.839, .846]:
        cube('home-notebook-page-edge', (3.918, .68, z), (.001, .252, .001),
             towel, 0)
    pencil = cylinder('home-desk-pencil', (4.062, .70, .872), .0055, .22,
                      M['oak'], (math.pi / 2, 0, .2))
    for idx in range(2):
        zz = .845 + idx * .024
        cube('home-cassette-case', (5.435, 1.185, zz), (.22, .135, .021),
             M['dark'], .003)
        cube('home-cassette-label', (5.435, 1.185, zz + .0115),
             (.183, .099, .002), M['paper'], .001)
        for dx in [-.052, .052]:
            cylinder('home-cassette-spool', (5.435 + dx, 1.185, zz + .013),
                     .020, .003, M['dark'])
            cylinder('home-cassette-spindle', (5.435 + dx, 1.185, zz + .015),
                     .007, .003, M['plastic'])
        cube('home-cassette-title-line', (5.435, 1.214, zz + .014),
             (.092, .004, .0015), ink, 0)

    # One modest pelargonium in the lower right corner of the living-room sill.
    plant_x, plant_y = 3.04, 1.25
    cylinder('home-plant-saucer', (plant_x, plant_y, 1.118), .104, .021,
             terracotta)
    bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=.066, radius2=.092,
                                    depth=.153, location=(plant_x, plant_y, 1.2))
    pot = bpy.context.object
    pot.name = 'home-plant-terracotta-pot'
    pot.data.materials.append(terracotta)
    static.append(pot)
    cylinder('home-plant-pot-rim', (plant_x, plant_y, 1.276), .096, .027,
             terracotta)
    cylinder('home-plant-soil', (plant_x, plant_y, 1.290), .079, .006, M['dark'])
    for idx, (dx, dy, height) in enumerate([(-.11, -.03, .20), (.09, .02, .27),
                                           (.015, -.07, .30), (-.03, .065, .25),
                                           (.13, -.05, .15), (-.12, .05, .12)]):
        tip = (plant_x + dx, plant_y + dy, 1.29 + height)
        curve('home-plant-stem', [(plant_x, plant_y, 1.287),
                                  (plant_x + dx * .35, plant_y + dy * .4,
                                   1.29 + height * .65), tip], .0038, foliage)
        # Folded broad leaves on angled planes, with a visible central vein.
        tx, ty, tz = tip
        verts = [(tx - .073, ty, tz - .017), (tx - .042, ty + .036, tz + .020),
                 (tx + .012, ty + .039, tz + .023), (tx + .071, ty, tz + .009),
                 (tx + .028, ty - .035, tz - .006), (tx - .034, ty - .032, tz - .023),
                 (tx, ty - .012, tz + .018)]
        mesh_object('home-plant-folded-leaf', verts,
                    [(j, (j + 1) % 6, 6) for j in range(6)], foliage)
        curve('home-plant-leaf-vein', [(tx - .062, ty, tz - .013),
                                      (tx, ty - .014, tz + .019),
                                      (tx + .060, ty, tz + .009)], .0015, leaf_lit)

    # A cotton towel is folded over the counter's front edge, clear of the sink.
    tx = -4.04
    verts, faces = [], []
    towel_path = [(1.05, .990), (.88, .990), (.73, .990),
                  (.548, .974), (.527, .88), (.523, .73), (.525, .66)]
    for row, (yy, zz) in enumerate(towel_path):
        for col in range(9):
            xx = tx - .12 + col * .030
            ripple = .005 * math.sin(col * 2.1) * (1 if row > 3 else .25)
            verts.append((xx, yy + ripple, zz + .002 * math.sin(col * 1.6)))
    for row in range(len(towel_path) - 1):
        for col in range(8):
            i = row * 9 + col
            faces.append((i, i + 1, i + 10, i + 9))
    cloth = mesh_object('home-draped-kitchen-towel', verts, faces, towel)
    solid = cloth.modifiers.new('cotton-thickness', 'SOLIDIFY')
    solid.thickness = .004
    for dx in [-.082, -.067, .068, .083]:
        curve('home-towel-woven-stripe',
              [(tx + dx, yy - .004, zz + .005) for yy, zz in towel_path],
              .0022, ink)
    cylinder('home-jam-jar', (-4.00, 1.16, 1.057), .052, .139, terracotta)
    cylinder('home-jam-jar-lid', (-4.00, 1.16, 1.132), .056, .015, M['brass'])
    cube('home-jam-jar-paper-label', (-4.00, 1.106, 1.054), (.070, .005, .055),
         M['paper'], .003)
    cube('home-kitchen-small-cutting-board', (-4.65, 1.30, .990),
         (.28, .23, .014), M['oak'], .023)
    for j in range(3):
        curve('home-cutting-board-knife-mark',
              [(-4.73 + .035 * j, 1.24, 1.0), (-4.64 + .035 * j, 1.35, 1.0)],
              .001, walnut)

    # Woven rug sits flush to the floor. Its border and sparse motifs can be
    # read at the master camera without covering feet or creating obstacles.
    rx, ry, rw, rh = 1.95, -.79, 2.37, .86
    cube('home-woven-rug', (rx, ry, .010), (rw, rh, .008), rug, .006)
    for inset, width, mat in [(.044, .022, rug_ochre), (.081, .013, rug_dark),
                               (.115, .017, rug_ochre)]:
        for side in [-1, 1]:
            cube('home-rug-long-border',
                 (rx, ry + side * (rh / 2 - inset), .015),
                 (rw - inset * 2, width, .0018), mat, 0)
            cube('home-rug-end-border',
                 (rx + side * (rw / 2 - inset), ry, .015),
                 (width, rh - inset * 2, .0018), mat, 0)
    for dx in [-.72, -.36, 0, .36, .72]:
        verts = [(rx + dx, ry - .10, .016), (rx + dx + .068, ry, .016),
                 (rx + dx, ry + .10, .016), (rx + dx - .068, ry, .016)]
        mesh_object('home-rug-woven-diamond', verts, [(0, 1, 2, 3)], rug_ochre)
        cube('home-rug-diamond-center', (rx + dx, ry, .017),
             (.033, .045, .001), rug_dark, 0)
    for side in [-1, 1]:
        for j in range(27):
            yy = ry - rh * .43 + j * rh * .86 / 26
            xx = rx + side * rw / 2
            curve('home-rug-short-fringe', [(xx, yy, .011),
                                           (xx + side * .030, yy + .003, .009)],
                  .0018, towel)

    return {
        'objectsAdded': len(static) - start,
        'clock': {'hourHand': 'clock-hour-hand', 'minuteHand': 'clock-minute-hand',
                  'axis': 'z', 'center': [cx, face_z, -cy],
                  'bounds': [[.965, 1.34, 1.39], [1.535, 1.63, 2.65]]},
        'rug': {'center': [rx, ry, .010], 'size': [rw, rh, .008]},
    }
