#include "Renderer.h"
#include "../html5.h"
#include <GLES3/gl3.h>
namespace OceanoGL
{
    Renderer::Renderer(char *id, float width, float height)
    {
        Width = width;
        Height = height;

        // Context configurations
        EmscriptenWebGLContextAttributes attrs;
        attrs.explicitSwapControl = 0;
        attrs.depth = 1;
        attrs.stencil = 1;
        attrs.antialias = 1;
        attrs.majorVersion = 2;
        attrs.minorVersion = 0;

        context = emscripten_webgl_create_context(id, &attrs);
        emscripten_webgl_make_context_current(context);

        shaderProgram = initShaderProgram(VSHADER_SOURCE, FSHADER_SOURCE);
    }

    Renderer::~Renderer()
    {
    }

    char VSHADER_SOURCE[] =
        "attribute vec4 a_Position;\n"
        "attribute vec4 a_Color;\n"
        "attribute vec4 a_Normal;\n"
        "uniform mat4 uMvpMatrix;\n"
        "uniform vec3 u_DirectionalLightColor;\n"
        "uniform vec3 u_DirectionalLightDirection;\n"
        "uniform vec3 u_AmbientLight;\n"
        "varying vec4 v_Color;\n"
        "void main()\n"
        "{\n"
        "   gl_Position = u_MvpMatrix * a_Position;\n"
        "   vec3 normal = normalize(vec3(a_Normal));\n"
        "   float nDotL = max(dot(u_DirectionalLightDirection, normal), 0.0);\n"
        "   vec3 diffuse = u_DirectionalLightColor * vec3(a_Color) * nDotL;\n"
        "   vec3 ambient = u_AmbientLight * a_Color.rgb;\n"
        "   v_Color = vec4(diffuse + ambient, a_Color.a);\n"
        "}\n";

    char FSHADER_SOURCE[] =
        "varying vec4 v_Color;\n"
        "void main()\n"
        "{\n"
        "   gl_FragColor = v_Color;\n"
        "}\n";

    ///
    // Create a shader object, load the shader source, and
    // compile the shader.
    //
    GLuint loadShader(GLenum type, const char *shaderSrc)
    {
        GLuint shader;
        GLint compiled;

        // Create the shader object
        shader = glCreateShader(type);

        if (shader == 0)
        {
            return 0;
        }

        // Load the shader source
        glShaderSource(shader, 1, &shaderSrc, NULL);

        // Compile the shader
        glCompileShader(shader);

        // Check the compile status
        glGetShaderiv(shader, GL_COMPILE_STATUS, &compiled);
        if (!compiled)
        {
            GLint infoLen = 0;

            glGetShaderiv(shader, GL_INFO_LOG_LENGTH, &infoLen);

            if (infoLen > 1)
            {
                // char *infoLog = malloc ( sizeof ( char ) * infoLen );
                char infoLog[infoLen];

                glGetShaderInfoLog(shader, infoLen, NULL, infoLog);
                printf("Error compiling shader:\n%s\n", infoLog);

                free(infoLog);
            }

            glDeleteShader(shader);
            return 0;
        }

        return shader;
    }

    GLuint initShaderProgram(const char *vsSource, const char *fsSource)
    {
        GLuint vertexShader;
        GLuint fragmentShader;
        GLuint shaderProgram;
        GLint linked;

        // Load the vertex/fragment shaders
        vertexShader = loadShader(GL_VERTEX_SHADER, vsSource);
        fragmentShader = loadShader(GL_FRAGMENT_SHADER, fsSource);

        // Create the program object
        shaderProgram = glCreateProgram();

        if (shaderProgram == 0)
        {
            return 0;
        }

        glAttachShader(shaderProgram, vertexShader);
        glAttachShader(shaderProgram, fragmentShader);

        // Link the program
        glLinkProgram(shaderProgram);

        // Check the link status
        glGetProgramiv(shaderProgram, GL_LINK_STATUS, &linked);

        if (!linked)
        {
            GLint infoLen = 0;

            glGetProgramiv(shaderProgram, GL_INFO_LOG_LENGTH, &infoLen);

            if (infoLen > 1)
            {
                // char *infoLog = malloc ( sizeof ( char ) * infoLen );
                char infoLog[infoLen];

                glGetProgramInfoLog(shaderProgram, infoLen, NULL, infoLog);
                printf("Error linking program:\n%s\n", infoLog);

                free(infoLog);
            }

            glDeleteProgram(shaderProgram);
            return 0;
        }

        return shaderProgram;
    }

    void Draw(Mesh *mesh, Matrix4 *mvp)
    {
    }

    void Renderer::Render(Scene *scene, Camera *camera)
    {
        //设置顶点坐标和颜色

        //设置背景颜色
        glEnable(GL_DEPTH_TEST);
        glClear(GL_DEPTH_BUFFER_BIT | GL_COLOR_BUFFER_BIT);

        glUseProgram(shaderProgram);
        std::map<std::string, Mesh *>::iterator iter;
        Matrix4 mvp; //model view projection matrix 模型视图投影矩阵
        //因为默认所有模型矩阵都是单位阵，即所有模型的坐标系都是默认的系统坐标系
        Multiply(&mvp, &camera->GetProjectionMatrix(), &camera->GetViewMatrix());
        for (iter = scene->GetMeshes()->begin(); iter != scene->GetMeshes()->end(); ++iter)
        {
            Draw(iter->second, &mvp);
        }
    }

    void Renderer::SetBackgroundColor(Vector4 *color)
    {
        _BackgroundColor = color;
        glClearColor(_BackgroundColor->v[0], _BackgroundColor->v[1], _BackgroundColor->v[2], _BackgroundColor->v[3]);
    }

} // namespace OceanoGL
