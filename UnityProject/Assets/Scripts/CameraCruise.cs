using UnityEngine;

public class CameraCruise : MonoBehaviour
{
    public Vector3 center = new Vector3(0f, 13f, -9f);
    public float radius = 0.3f;
    public float speed = 0.4f;
    private float _theta;

    void Update()
    {
        _theta += Time.deltaTime * speed;
        transform.position = center + new Vector3(Mathf.Sin(_theta)*radius, 0, Mathf.Cos(_theta)*radius);
        transform.LookAt(new Vector3(0f, 0f, 2.5f));
    }
}