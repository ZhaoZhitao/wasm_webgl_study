#include "Context.h"


///
// Create a shader object, load the shader source, and
// compile the shader.
//
GLuint loadShader ( GLenum type, const char *shaderSrc ){
    GLuint shader;
    GLint compiled;

    // Create the shader object
    shader = glCreateShader ( type );

    if ( shader == 0 )
    {
        return 0;
    }

    // Load the shader source
    glShaderSource ( shader, 1, &shaderSrc, NULL );

    // Compile the shader
    glCompileShader ( shader );

    // Check the compile status
    glGetShaderiv ( shader, GL_COMPILE_STATUS, &compiled );
    if ( !compiled )
    {
        GLint infoLen = 0;

        glGetShaderiv ( shader, GL_INFO_LOG_LENGTH, &infoLen );

        if ( infoLen > 1 )
        {
            // char *infoLog = malloc ( sizeof ( char ) * infoLen );
            char infoLog[infoLen];

            glGetShaderInfoLog ( shader, infoLen, NULL, infoLog );
            printf( "Error compiling shader:\n%s\n", infoLog );

            free ( infoLog );
        }

        glDeleteShader ( shader );
        return 0;
    }

    return shader;
}

GLuint initShaderProgram( const char *vsSource, const char *fsSource){
    GLuint vertexShader;
    GLuint fragmentShader;
    GLuint shaderProgram;
    GLint linked;

    // Load the vertex/fragment shaders
    vertexShader = loadShader ( GL_VERTEX_SHADER, vsSource );
    fragmentShader = loadShader ( GL_FRAGMENT_SHADER, fsSource );

    // Create the program object
    shaderProgram = glCreateProgram ( );

    if ( shaderProgram == 0 )
    {
        return 0;
    }

    glAttachShader ( shaderProgram, vertexShader );
    glAttachShader ( shaderProgram, fragmentShader );

    // Link the program
    glLinkProgram ( shaderProgram );

    // Check the link status
    glGetProgramiv ( shaderProgram, GL_LINK_STATUS, &linked );

    if ( !linked )
    {
        GLint infoLen = 0;

        glGetProgramiv ( shaderProgram, GL_INFO_LOG_LENGTH, &infoLen );

        if ( infoLen > 1 )
        {
            // char *infoLog = malloc ( sizeof ( char ) * infoLen );
            char infoLog[infoLen];

            glGetProgramInfoLog ( shaderProgram, infoLen, NULL, infoLog );
            printf( "Error linking program:\n%s\n", infoLog );

            free ( infoLog );
        }

        glDeleteProgram ( shaderProgram );
        return 0;
    }

    return shaderProgram;
}

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

void Context::DrawTriangle(){
    emscripten_webgl_make_context_current(context);
    // // Vertex shader program
    // char vsSource[] = 
    //     "attribute vec4 aVertexPosition;                                            \n"
    //     "uniform mat4 uModelViewMatrix;                                             \n"
    //     "uniform mat4 uProjectionMatrix;                                            \n"
    //     "void main() {                                                              \n"
    //     "   gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;   \n"
    //     "}                                                                          \n";

    // // Fragment shader program
    // char fsSource[] = 
    //     "void main() {                                                              \n"
    //     "   gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);                                \n"
    //     "}                                                                          \n";

    char vsSource[] =
        "#version 300 es                          \n"
        "layout(location = 0) in vec4 vPosition;  \n"
        "void main()                              \n"
        "{                                        \n"
        "   gl_Position = vPosition;              \n"
        "}                                        \n";

    char fsSource[] =
        "#version 300 es                              \n"
        "precision mediump float;                     \n"
        "out vec4 fragColor;                          \n"
        "void main()                                  \n"
        "{                                            \n"
        "   fragColor = vec4 ( 1.0, 0.0, 0.0, 1.0 );  \n"
        "}                                            \n";

    GLuint shaderProgram;

    shaderProgram = initShaderProgram(vsSource, fsSource);
    
    if(shaderProgram > 0){
        float fieldOfView = 45 * 3.1415926 /180;
        float aspect = 4.0 / 3.0;
        float zNear = 0.1;
        float zFar = 100.0;

        GLfloat vVertices[] = {  0.0f,  0.5f, 0.0f,
                                -0.5f, -0.5f, 0.0f,
                                0.5f, -0.5f, 0.0f
                             };

        // Set the viewport
        glViewport(0, 0, width, height);
        printf("glViewport.\n");

        // Clear the color buffer
        glClearColor(1.0f, 1.0f, 1.0f, 0.0f);
        glClear(GL_COLOR_BUFFER_BIT );

        // Use the program object
        glUseProgram(shaderProgram);
        printf("glUseProgram.\n");

        // Load the vertex data
        glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 0, vVertices);
        printf("glVertexAttribPointer.\n");
        glEnableVertexAttribArray(0);
        printf("glEnableVertexAttribArray.\n");

        glDrawArrays(GL_TRIANGLES, 0, 3);
        printf("glDrawArrays.\n");
    }
    else{
        printf("failed to initShaderProgram:%d\n", shaderProgram);
    }
}