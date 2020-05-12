

class Context {
public:
    Context (int width, int height, char * id);

    ~Context (void);

    void SetBackgroundColor(GLfloat red, GLfloat green, GLfloat blue, GLfloat alpha);

private:
    int width;
    int height;

    GLuint programObject;
    GLuint vertexShader;
    GLuint fragmentShader;

    EMSCRIPTEN_WEBGL_CONTEXT_HANDLE context;

};