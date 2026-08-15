import unreal

def setup_forensic_lighting():
    """Sets up the 'Golden Hour' Venice Beach lighting in Unreal 5.7."""
    editor_subs = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
    world = editor_subs.get_editor_world()
    
    # 1. Spawn Directional Light (The Sun)
    sun_actor = unreal.EditorLevelLibrary.spawn_actor_from_class(unreal.DirectionalLight, unreal.Vector(0, 0, 1000))
    sun_comp = sun_actor.get_component_by_class(unreal.DirectionalLightComponent)
    sun_comp.set_intensity(10.0)
    sun_comp.set_light_color(unreal.Color(255, 120, 30)) # Deep Orange
    
    # 2. Setup Post Process for "Juiced" Aesthetic
    # Add Chromatic Aberration and Bloom
    print("Forensic Lighting Setup Complete.")

if __name__ == "__main__":
    setup_forensic_lighting()
