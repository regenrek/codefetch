// Engine processor - should NOT be included when using includeFiles for lib.rs only
pub struct Processor {
    pub name: String,
}

impl Processor {
    pub fn new(name: &str) -> Self {
        Processor { name: name.to_string() }
    }
}
