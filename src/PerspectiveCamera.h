#ifndef PerspectiveCamera_h
#define PerspectiveCamera_h
#include "Camera.h"

namespace OceanoGL
{

    class PerspectiveCamera : public Camera
    {
    private:
        /* data */
    public:
        PerspectiveCamera(/* args */);
        ~PerspectiveCamera();
        float FovY, Aspect, NearZ, FarZ;
        Matrix4 GetMatrix();
    };

} // namespace OceanoGL
#endif