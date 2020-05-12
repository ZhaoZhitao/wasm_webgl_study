#include "Context.h"

Context::Context (int w, int h, char * id) {
    printf("start Context::Context(%d,%d,%s)\n", w,h,id);
    width = w;
    height = h;

    // Context configurations
    EmscriptenWebGLContextAttributes attrs;
    attrs.explicitSwapControl = 0;
    attrs.depth = 1;
    attrs.stencil = 1;
    attrs.antialias = 1;
    attrs.majorVersion = 2;
    attrs.minorVersion = 0;

    context = emscripten_webgl_create_context(id, &attrs);
    printf("emscripten_webgl_create_context.\n");

    emscripten_webgl_make_context_current(context);
    printf("emscripten_webgl_make_context_current.\n");

}

Context::~Context (void) {
    printf("start Context::~Context()\n");
    emscripten_webgl_destroy_context(context);
    printf("end Context::~Context()\n");
}

void Context::SetBackgroundColor(GLfloat red, GLfloat green, GLfloat blue, GLfloat alpha){
    emscripten_webgl_make_context_current(context);
    glClearColor(red, green, blue, alpha);
    glClear(GL_COLOR_BUFFER_BIT);
}