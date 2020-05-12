#include <emscripten.h>
#include <string>
#include <GLES2/gl2.h>
#include <EGL/egl.h>
extern "C" {
    #include "../html5.h"
}
#include "Context.cpp"

Context* context;

int main(int argc, char const *argv[]) {
    printf("main() called.\n");

    EM_ASM(
        if (typeof window!="undefined") {
            window.dispatchEvent(new CustomEvent("wasmLoaded"))
        } else {
            global.onWASMLoaded && global.onWASMLoaded()
        }
    );

    return 0;
}


extern "C" {

    EMSCRIPTEN_KEEPALIVE
    void clearContext (void) {
        if (context) delete context;
    }

    EMSCRIPTEN_KEEPALIVE
    void createContext (int width, int height, char * id) {
        context = new Context(width, height, id);
        free(id);
    }

    EMSCRIPTEN_KEEPALIVE
    void setContextBackgroundColor (GLfloat red, GLfloat green, GLfloat blue, GLfloat alpha) {
        if (context) {
            context->SetBackgroundColor(red,green,blue,alpha);
        }
        else {
            printf("please create a context first.\n");
        }
    }

}