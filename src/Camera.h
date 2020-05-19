#ifndef Camera_h
#define Camera_h
#include "Vector4.h"
#include "Matrix4.h"

namespace OceanoGL
{
    class Camera
    {
    private:
        /* data */
    public:
        Camera(/* args */);
        ~Camera();
        Vector4 EyePoint;
        Vector4 LookAtPoint;
        Vector4 UpDirection;
        Matrix4 GetViewMatrix();
        virtual Matrix4 GetProjectionMatrix() = 0;
    };
} // namespace OceanoGL
#endif
