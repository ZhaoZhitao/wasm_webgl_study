#ifndef Render_h
#define Render_h
#include "Vector4.h"
#include "Scene.h"
#include "Camera.h"
#include "../html5.h"
namespace OceanoGL
{
    class Renderer
    {
    private:
        EMSCRIPTEN_WEBGL_CONTEXT_HANDLE context;
        GLuint shaderProgram;
        Vector4 *_BackgroundColor;

    public:
        Renderer(char *id, float width, float height);
        ~Renderer();
        float Width, Height;

        void Render(Scene *scene, Camera *camera);
        void SetBackgroundColor(Vector4 *color);
    };
} // namespace OceanoGL

#endif