using UnityEngine;

public class ZoneGlowPulse : MonoBehaviour
{
    public Color baseColor = new Color(1f, 0.6f, 0.2f);
    public float pulseSpeed = 1.5f;
    public float minIntensity = 0.5f;
    public float maxIntensity = 2.0f;
    private Material _mat;
    private float _phase;

    void Start()
    {
        var rend = GetComponent<Renderer>();
        if (rend) _mat = rend.material;
    }

    void Update()
    {
        if (_mat == null) return;
        float t = (Mathf.Sin(Time.time * pulseSpeed) + 1f) / 2f;
        float intensity = Mathf.Lerp(minIntensity, maxIntensity, t);
        _mat.SetColor("_EmissionColor", baseColor * intensity);
        DynamicGI.SetEmissive(GetComponent<Renderer>(), _mat.GetColor("_EmissionColor"));
    }
}