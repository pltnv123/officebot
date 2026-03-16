import bpy, math, os

def clear_scene():
 bpy.ops.object.select_all(action='SELECT')
 bpy.ops.object.delete()

def add_smooth_material(name, color, metallic=0.3, roughness=0.2):
 mat = bpy.data.materials.new(name)
 mat.use_nodes = True
 bsdf = mat.node_tree.nodes["Principled BSDF"]
 bsdf.inputs["Base Color"].default_value = (*color, 1)
 bsdf.inputs["Metallic"].default_value = metallic
 bsdf.inputs["Roughness"].default_value = roughness
 return mat

def add_emission_material(name, color, strength=5.0):
 mat = bpy.data.materials.new(name)
 mat.use_nodes = True
 nodes = mat.node_tree.nodes
 nodes.clear()
 emit = nodes.new("ShaderNodeEmission")
 emit.inputs["Color"].default_value = (*color, 1)
 emit.inputs["Strength"].default_value = strength
 out = nodes.new("ShaderNodeOutputMaterial")
 mat.node_tree.links.new(emit.outputs[0], out.inputs[0])
 return mat

def build_robot(location, body_color, eye_color, name):
 body_mat = add_smooth_material(f"{name}_body", body_color, 0.4, 0.15)
 eye_mat = add_emission_material(f"{name}_eye", eye_color, 8.0)
 dark_mat = add_smooth_material(f"{name}_dark", (0.05,0.05,0.07), 0.6, 0.1)

 objs = []

 # TORSO — rounded box shape via subdivided cube
 bpy.ops.mesh.primitive_cube_add(size=1, location=(location[0], location[1], location[2]+0.7))
 torso = bpy.context.active_object
 torso.name = f"{name}_torso"
 torso.scale = (0.55, 0.40, 0.55)
 bpy.ops.object.modifier_add(type='SUBSURF')
 torso.modifiers["Subdivision"].levels = 2
 torso.data.materials.append(body_mat)
 objs.append(torso)

 # HEAD — rounded cube
 bpy.ops.mesh.primitive_cube_add(size=1, location=(location[0], location[1], location[2]+1.45))
 head = bpy.context.active_object
 head.name = f"{name}_head"
 head.scale = (0.50, 0.42, 0.44)
 bpy.ops.object.modifier_add(type='SUBSURF')
 head.modifiers["Subdivision"].levels = 3
 head.data.materials.append(body_mat)
 objs.append(head)

 # FACE PLATE — dark visor
 bpy.ops.mesh.primitive_cube_add(size=1, location=(location[0], location[1]-0.38, location[2]+1.45))
 face = bpy.context.active_object
 face.name = f"{name}_face"
 face.scale = (0.38, 0.04, 0.30)
 face.data.materials.append(dark_mat)
 objs.append(face)

 # LEFT EYE
 bpy.ops.mesh.primitive_uv_sphere_add(radius=0.09, location=(location[0]-0.13, location[1]-0.41, location[2]+1.48))
 eye_l = bpy.context.active_object
 eye_l.name = f"{name}_eye_l"
 bpy.ops.object.modifier_add(type='SUBSURF')
 eye_l.data.materials.append(eye_mat)
 objs.append(eye_l)

 # RIGHT EYE
 bpy.ops.mesh.primitive_uv_sphere_add(radius=0.09, location=(location[0]+0.13, location[1]-0.41, location[2]+1.48))
 eye_r = bpy.context.active_object
 eye_r.name = f"{name}_eye_r"
 bpy.ops.object.modifier_add(type='SUBSURF')
 eye_r.data.materials.append(eye_mat)
 objs.append(eye_r)

 # LEGS — two rounded cylinders
 for side in [-0.18, 0.18]:
  bpy.ops.mesh.primitive_cylinder_add(radius=0.12, depth=0.5, location=(location[0]+side, location[1], location[2]+0.25))
  leg = bpy.context.active_object
  leg.name = f"{name}_leg_{side}"
  bpy.ops.object.modifier_add(type='SUBSURF')
  leg.data.materials.append(body_mat)
  objs.append(leg)

 # FEET — small rounded cubes
 for side in [-0.18, 0.18]:
  bpy.ops.mesh.primitive_cube_add(size=1, location=(location[0]+side, location[1]+0.05, location[2]+0.05))
  foot = bpy.context.active_object
  foot.name = f"{name}_foot_{side}"
  foot.scale = (0.14, 0.20, 0.10)
  bpy.ops.object.modifier_add(type='SUBSURF')
  foot.data.materials.append(dark_mat)
  objs.append(foot)

 # ARMS
 for side in [-0.62, 0.62]:
  bpy.ops.mesh.primitive_cylinder_add(radius=0.09, depth=0.45, location=(location[0]+side, location[1], location[2]+0.72))
  arm = bpy.context.active_object
  arm.name = f"{name}_arm_{side}"
  arm.rotation_euler = (0, math.radians(90), 0)
  bpy.ops.object.modifier_add(type='SUBSURF')
  arm.data.materials.append(body_mat)
  objs.append(arm)

 # ANTENNA (only on planner)
 if "PLANNER" in name:
  bpy.ops.mesh.primitive_cylinder_add(radius=0.025, depth=0.3, location=(location[0]+0.15, location[1], location[2]+1.78))
  ant = bpy.context.active_object
  ant.data.materials.append(dark_mat)
  objs.append(ant)
  bpy.ops.mesh.primitive_uv_sphere_add(radius=0.05, location=(location[0]+0.15, location[1], location[2]+1.95))
  tip = bpy.context.active_object
  tip.data.materials.append(eye_mat)
  objs.append(tip)

 # Join all parts
 bpy.ops.object.select_all(action='DESELECT')
 for o in objs:
  o.select_set(True)
 bpy.context.view_layer.objects.active = objs[0]
 bpy.ops.object.join()
 robot = bpy.context.active_object
 robot.name = name
 return robot

# BUILD SCENE
clear_scene()

# Three robots
build_robot((-2.5, 1.5, 0), (0.85, 0.85, 0.88), (0.2, 0.9, 0.8), "WORKER")
build_robot((0.0, 0.5, 0), (0.80, 0.80, 0.85), (0.3, 0.6, 1.0), "PLANNER")
build_robot((2.5, 1.0, 0), (0.85, 0.85, 0.88), (0.2, 0.9, 0.8), "REVIEWER")

# Export each robot as FBX
out_dir = os.path.dirname(os.path.abspath(__file__)) + "/../Assets/Models/"
os.makedirs(out_dir, exist_ok=True)

for name in ["WORKER", "PLANNER", "REVIEWER"]:
 obj = bpy.data.objects.get(name)
 if obj:
  bpy.ops.object.select_all(action='DESELECT')
  obj.select_set(True)
  bpy.context.view_layer.objects.active = obj
  out_path = out_dir + name + ".fbx"
  bpy.ops.export_scene.fbx(
   filepath=out_path,
   use_selection=True,
   apply_scale_options='FBX_SCALE_ALL',
   add_leaf_bones=False
  )
  print(f"Exported: {out_path}")

print("ALL ROBOTS EXPORTED")
