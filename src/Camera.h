#ifndef Camera_h
#define Camera_h
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
        virtual Matrix4 GetMatrix() = 0;
    };
} // namespace OceanoGL
#endif
