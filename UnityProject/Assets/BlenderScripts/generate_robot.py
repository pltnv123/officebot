import bpy
import math
import os

def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()

def add_cube(name, location, scale, color_hex):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    mat = bpy.data.materials.new(name=name + "_mat")
    mat.use_nodes = True
    r = int(color_hex[0:2], 16) / 255
    g = int(color_hex[2:4], 16) / 255
    b = int(color_hex[4:6], 16) / 255
    mat.node_tree.nodes["Principled BSDF"].inputs[0].default_value = (r, g, b, 1)
    mat.node_tree.nodes["Principled BSDF"].inputs[7].default_value = 0.0
    obj.data.materials.append(mat)
    return obj

def add_cylinder(name, location, scale, color_hex):
    bpy.ops.mesh.primitive_cylinder_add(location=location, vertices=16)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    mat = bpy.data.materials.new(name=name + "_mat")
    mat.use_nodes = True
    r = int(color_hex[0:2], 16) / 255
    g = int(color_hex[2:4], 16) / 255
    b = int(color_hex[4:6], 16) / 255
    mat.node_tree.nodes["Principled BSDF"].inputs[0].default_value = (r, g, b, 1)
    mat.node_tree.nodes["Principled BSDF"].inputs[7].default_value = 0.0
    obj.data.materials.append(mat)
    return obj

def add_sphere(name, location, scale, color_hex, emission=0):
    bpy.ops.mesh.primitive_uv_sphere_add(location=location, segments=24, ring_count=16)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    mat = bpy.data.materials.new(name=name + "_mat")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    r = int(color_hex[0:2], 16) / 255
    g = int(color_hex[2:4], 16) / 255
    b = int(color_hex[4:6], 16) / 255
    bsdf = nodes["Principled BSDF"]
    bsdf.inputs[0].default_value = (r, g, b, 1)
    if emission > 0:
        bsdf.inputs[19].default_value = (r, g, b, 1)
        bsdf.inputs[20].default_value = emission
    obj.data.materials.append(mat)
    return obj

def build_robot(name, eye_color_hex, output_path):
    clear_scene()
    objects = []

    DARK = "383840"
    MID = "404048"
    LIGHT = "C0C0C8"

    objects.append(add_cylinder("WheelBase", (0, 0, 0.15), (0.55, 0.55, 0.08), "202025"))
    objects.append(add_cube("Body", (0, 0, 0.75), (0.52, 0.38, 0.48), DARK))
    objects.append(add_cube("ChestPanel", (0, -0.39, 0.75), (0.38, 0.02, 0.32), MID))

    for i, z in enumerate([0.85, 0.75, 0.65]):
        objects.append(add_cube(f"Stripe{i}", (0, -0.41, z), (0.30, 0.01, 0.02), "505058"))

    objects.append(add_cylinder("Neck", (0, 0, 1.28), (0.14, 0.14, 0.08), "202025"))
    objects.append(add_cube("Head", (0, 0, 1.58), (0.50, 0.46, 0.44), MID))
    objects.append(add_cube("FaceScreen", (0, -0.47, 1.58), (0.42, 0.02, 0.36), "080810"))

    eyeL = add_sphere("EyeLeft", (-0.14, -0.49, 1.60), (0.10, 0.04, 0.10), eye_color_hex, emission=5.0)
    eyeR = add_sphere("EyeRight", (0.14, -0.49, 1.60), (0.10, 0.04, 0.10), eye_color_hex, emission=5.0)
    objects.extend([eyeL, eyeR])

    objects.append(add_cylinder("EyeRingL", (-0.14, -0.48, 1.60), (0.12, 0.12, 0.005), "101010"))
    objects.append(add_cylinder("EyeRingR", (0.14, -0.48, 1.60), (0.12, 0.12, 0.005), "101010"))

    objects.append(add_cube("ArmLUp", (-0.65, 0, 0.88), (0.12, 0.12, 0.22), DARK))
    objects.append(add_sphere("ElbowL", (-0.65, 0, 0.64), (0.10, 0.10, 0.10), MID))
    objects.append(add_cube("ArmLDown", (-0.68, 0.06, 0.45), (0.10, 0.10, 0.18), DARK))
    objects.append(add_cube("HandL", (-0.70, 0.08, 0.26), (0.12, 0.10, 0.10), LIGHT))
    for i, x in enumerate([-0.76, -0.70, -0.64]):
        objects.append(add_cube(f"FingerL{i}", (x, 0.10, 0.18), (0.03, 0.03, 0.06), MID))

    objects.append(add_cube("ArmRUp", (0.65, 0, 0.88), (0.12, 0.12, 0.22), DARK))
    objects.append(add_sphere("ElbowR", (0.65, 0, 0.64), (0.10, 0.10, 0.10), MID))
    objects.append(add_cube("ArmRDown", (0.68, 0.06, 0.45), (0.10, 0.10, 0.18), DARK))
    objects.append(add_cube("HandR", (0.70, 0.08, 0.26), (0.12, 0.10, 0.10), LIGHT))
    for i, x in enumerate([0.64, 0.70, 0.76]):
        objects.append(add_cube(f"FingerR{i}", (x, 0.10, 0.18), (0.03, 0.03, 0.06), MID))

    objects.append(add_cylinder("AntBase", (0.22, 0, 1.95), (0.025, 0.025, 0.12), "303035"))
    objects.append(add_sphere("AntTip", (0.22, 0, 2.12), (0.05, 0.05, 0.05), eye_color_hex, emission=3.0))

    objects.append(add_cube("ShoulderL", (-0.56, 0, 1.10), (0.16, 0.16, 0.10), MID))
    objects.append(add_cube("ShoulderR", (0.56, 0, 1.10), (0.16, 0.16, 0.10), MID))

    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.join()

    bpy.ops.export_scene.fbx(
        filepath=output_path,
        use_selection=True,
        axis_forward='-Z',
        axis_up='Y',
        apply_unit_scale=True,
        apply_scale_options='FBX_SCALE_ALL',
        bake_space_transform=True
    )
    print(f"Exported {name} to {output_path}")

output_dir = "/github/workspace/UnityProject/Assets/Models/Robots"
os.makedirs(output_dir, exist_ok=True)

build_robot("WorkerBot", "1AE066", f"{output_dir}/WorkerBot.fbx")
build_robot("PlannerBot", "3388FF", f"{output_dir}/PlannerBot.fbx")
build_robot("ReviewerBot", "1AE066", f"{output_dir}/ReviewerBot.fbx")

print("All robots generated successfully!")
