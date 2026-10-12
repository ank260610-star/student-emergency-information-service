"""Build the editable four-engine campus widebody aircraft asset.

Run with Blender in background mode.  The resulting model is original,
generic geometry for the map; it is intentionally not presented as an
official aircraft-manufacturer CAD asset.
"""

from pathlib import Path
import sys

import bpy
from mathutils import Vector


OUTPUT = Path(sys.argv[sys.argv.index("--") + 1]).resolve() if "--" in sys.argv else Path("campus-widebody-747.glb").resolve()


def material(name, color, metallic=0.0, roughness=0.5, emission=None):
    value = bpy.data.materials.new(name)
    value.diffuse_color = (*color, 1)
    value.use_nodes = True
    principled = value.node_tree.nodes.get("Principled BSDF")
    principled.inputs["Base Color"].default_value = (*color, 1)
    principled.inputs["Metallic"].default_value = metallic
    principled.inputs["Roughness"].default_value = roughness
    if emission:
        principled.inputs["Emission Color"].default_value = (*emission, 1)
        principled.inputs["Emission Strength"].default_value = 3
    return value


WHITE = material("warm white fuselage", (0.82, 0.84, 0.82), 0.18, 0.32)
SILVER = material("engine alloy", (0.18, 0.22, 0.25), 0.72, 0.22)
DARK = material("window and intake", (0.018, 0.035, 0.055), 0.55, 0.16)
NAV = material("navigation light", (1.0, 0.12, 0.06), 0.1, 0.24, (1.0, 0.02, 0.0))
BLUE = material("tail stripe", (0.035, 0.16, 0.29), 0.2, 0.33)


def smooth(obj):
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    bevel = obj.modifiers.new("small panel edge", "BEVEL")
    bevel.width = 0.04
    bevel.segments = 2


def uv_sphere(name, location, scale, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=40, ring_count=20, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    smooth(obj)
    return obj


def box(name, location, scale, mat):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    bevel = obj.modifiers.new("edge bevel", "BEVEL")
    bevel.width = 0.08
    bevel.segments = 2
    return obj


def cylinder(name, location, radius, depth, mat, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    smooth(obj)
    return obj


bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)

root = bpy.data.objects.new("Campus four-engine widebody (editable source)", None)
bpy.context.collection.objects.link(root)

fuselage = uv_sphere("fuselage", (0, 0, 0), (3.0, 3.0, 25.5), WHITE)
fuselage.parent = root
# Short upper-deck hump distinguishes the widebody silhouette without copying livery.
hump = uv_sphere("upper deck", (0, 2.05, -5.8), (2.35, 1.15, 9.2), WHITE)
hump.parent = root

wing = box("main wing", (0, 0.15, -0.8), (31.0, 0.23, 3.25), WHITE)
wing.parent = root
for side in (-1, 1):
    tip = box("wing tip", (side * 29.8, 0.45, -1.45), (2.5, 0.18, 2.0), WHITE)
    tip.rotation_euler.y = side * 0.08
    tip.parent = root

tailplane = box("horizontal stabilizer", (0, 1.7, 20.0), (12.8, 0.14, 1.5), WHITE)
tailplane.parent = root
tail = box("vertical stabilizer", (0, 5.0, 20.0), (0.18, 5.0, 3.0), BLUE)
tail.rotation_euler.x = -0.25
tail.parent = root

# Four independently named nacelles are retained as editable engine groups.
for side in (-1, 1):
    for index, x in enumerate((10.8, 20.2), start=1):
        engine_root = bpy.data.objects.new(f"engine {side:+d}-{index}", None)
        bpy.context.collection.objects.link(engine_root)
        engine_root.parent = root
        engine_root.location = (side * x, -1.75, -1.2)
        nacelle = cylinder("nacelle", (0, 0, 0), 1.7, 7.4, SILVER, (1.5708, 0, 0))
        nacelle.parent = engine_root
        intake = cylinder("intake", (0, 0, -3.76), 1.37, 0.12, DARK, (1.5708, 0, 0))
        intake.parent = engine_root
        exhaust = cylinder("exhaust", (0, 0, 3.76), 0.83, 0.12, DARK, (1.5708, 0, 0))
        exhaust.parent = engine_root
        pylon = box("engine pylon", (0, 1.35, 0), (0.35, 1.15, 1.2), WHITE)
        pylon.parent = engine_root

for x in (-2.0, -1.25, -0.5, 0.5, 1.25, 2.0):
    for z in (-18.3, -16.4, -14.5, -12.6, -10.7, -8.8, -6.9, -5.0, -3.1, -1.2, 0.7, 2.6, 4.5, 6.4, 8.3, 10.2):
        window = uv_sphere("cabin window", (x, 1.18, z), (0.19, 0.13, 0.32), DARK)
        window.parent = root

for side in (-1, 1):
    light = uv_sphere("wing navigation light", (side * 32.5, 0.45, -1.45), (0.28, 0.16, 0.16), NAV)
    light.parent = root

for obj in bpy.context.scene.objects:
    obj.select_set(True)
bpy.context.view_layer.objects.active = fuselage
bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT.with_suffix(".blend")))
bpy.ops.export_scene.gltf(filepath=str(OUTPUT), export_format="GLB", use_selection=False, export_apply=True, export_materials="EXPORT")
