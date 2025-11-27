// Engine library - processing logic
use core::types::Context;

pub fn process(ctx: &Context) {
    println!("Processing with context: {:?}", ctx.config.name);
}

pub fn run() {
    println!("Engine running");
}
