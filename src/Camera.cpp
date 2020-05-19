#include "Camera.h"

namespace OceanoGL
{
    Camera::Camera(/* args */)
    {
    }

    Camera::~Camera()
    {
    }

    Matrix4 Camera::GetViewMatrix()
    {
        Matrix4 mat;
        LookAt(&mat, EyePoint.v[0], EyePoint.v[1], EyePoint.v[2], LookAtPoint.v[0], LookAtPoint.v[1], LookAtPoint.v[2], UpDirection.v[0], UpDirection.v[1], UpDirection.v[2]);
        return mat;
    }

} // namespace OceanoGL
