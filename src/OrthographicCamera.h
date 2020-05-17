#ifndef OrthographicCamera_h
#define OrthographicCamera_h
#include "Camera.h"

namespace OceanoGL
{
    class OrthographicCamera : public Camera
    {
    private:
        /* data */
    public:
        OrthographicCamera(/* args */);
        ~OrthographicCamera();
        Matrix4 GetMatrix();
        float Left, Right, Bottom, Top, NearZ, FarZ;
    };
} // namespace OceanoGL
#endif
