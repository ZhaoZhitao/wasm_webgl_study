
#ifndef Matrix4_h
#define Matrix4_h
#include <math.h>
#include <string.h>
#define PI 3.1415926535897932384626433832795f

namespace OceanoGL
{
    typedef struct Matrix4
    {
        float m[4][4];
    };

    //
    /// \brief Multiply matrix specified by result with a scaling matrix and return new matrix in result
    /// \param result Specifies the input matrix.  Scaled matrix is returned in result.
    /// \param sx, sy, sz Scale factors along the x, y and z axes respectively
    //
    void Scale(Matrix4 *result, float sx, float sy, float sz);

    //
    /// \brief Multiply matrix specified by result with a translation matrix and return new matrix in result
    /// \param result Specifies the input matrix.  Translated matrix is returned in result.
    /// \param tx, ty, tz Scale factors along the x, y and z axes respectively
    //
    void Translate(Matrix4 *result, float tx, float ty, float tz);

    //
    /// \brief Multiply matrix specified by result with a rotation matrix and return new matrix in result
    /// \param result Specifies the input matrix.  Rotated matrix is returned in result.
    /// \param angle Specifies the angle of rotation, in degrees.
    /// \param x, y, z Specify the x, y and z coordinates of a vector, respectively
    //
    void Rotate(Matrix4 *result, float angle, float x, float y, float z);

    //
    /// \brief Multiply matrix specified by result with a perspective matrix and return new matrix in result
    /// \param result Specifies the input matrix.  New matrix is returned in result.
    /// \param left, right Coordinates for the left and right vertical clipping planes
    /// \param bottom, top Coordinates for the bottom and top horizontal clipping planes
    /// \param nearZ, farZ Distances to the near and far depth clipping planes.  Both distances must be positive.
    //
    void Frustum(Matrix4 *result, float left, float right, float bottom, float top, float nearZ, float farZ);

    //
    /// \brief Multiply matrix specified by result with a perspective matrix and return new matrix in result
    /// \param result Specifies the input matrix.  New matrix is returned in result.
    /// \param fovy Field of view y angle in degrees
    /// \param aspect Aspect ratio of screen
    /// \param nearZ Near plane distance
    /// \param farZ Far plane distance
    //
    void Perspective(Matrix4 *result, float fovy, float aspect, float nearZ, float farZ);

    //
    /// \brief Multiply matrix specified by result with a perspective matrix and return new matrix in result
    /// \param result Specifies the input matrix.  New matrix is returned in result.
    /// \param left, right Coordinates for the left and right vertical clipping planes
    /// \param bottom, top Coordinates for the bottom and top horizontal clipping planes
    /// \param nearZ, farZ Distances to the near and far depth clipping planes.  These values are negative if plane is behind the viewer
    //
    void Orthographic(Matrix4 *result, float left, float right, float bottom, float top, float nearZ, float farZ);

    //
    /// \brief Perform the following operation - result matrix = srcA matrix * srcB matrix
    /// \param result Returns multiplied matrix
    /// \param srcA, srcB Input matrices to be multiplied
    //
    void Multiply(Matrix4 *result, Matrix4 *srcA, Matrix4 *srcB);

    //
    //// \brief Return an identity matrix
    //// \param result Returns identity matrix
    //
    void Identity(Matrix4 *result);

    //
    /// \brief Generate a transformation matrix from eye position, look at and up vectors
    /// \param result Returns transformation matrix
    /// \param posX, posY, posZ           eye position
    /// \param lookAtX, lookAtY, lookAtZ  look at vector
    /// \param upX, upY, upZ              up vector
    //
    void LookAt(Matrix4 *result,
                float posX, float posY, float posZ,
                float lookAtX, float lookAtY, float lookAtZ,
                float upX, float upY, float upZ);

} // namespace OceanoGL
#endif
