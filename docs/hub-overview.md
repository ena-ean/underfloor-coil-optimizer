# Underfloor heating coil optimizer

Give it the loop lengths of an underfloor heating circuit and the coil sizes your
supplier sells, and it returns a purchase plan with almost nothing left over. It
also shows how far the plan is from the mathematical minimum, so you know whether
it is optimal or merely good.

Everything runs in the browser. No accounts, no backend, no tracking. The
interface is Russian and English, and a switch in the header moves every length
between metres and feet, from the loop input to the CSV and HTML exports.

Demo: <https://coilcalculator.enaserver.ru/>

![Entering loops](https://raw.githubusercontent.com/ena-ean/underfloor-coil-optimizer/main/docs/screenshot-loops.png)

![Packing result](https://raw.githubusercontent.com/ena-ean/underfloor-coil-optimizer/main/docs/screenshot-result.png)

## Run the image

```bash
docker run -d --name coil-optimizer -p 3000:3000 enaresearch/underfloor-coil-optimizer:latest
```

Then open <http://localhost:3000>. Tag `1.1.1` is the same build as `latest`.

## Run with Compose

```yaml
services:
  coil-optimizer:
    image: enaresearch/underfloor-coil-optimizer:latest
    container_name: coil-optimizer
    ports:
      - "3000:3000"
    restart: unless-stopped
```

The image already sets `NODE_ENV`, the telemetry switch and the healthcheck, so
the Compose file carries only the container name, the port and the restart
policy.

## The image

`linux/amd64`, under 60 MB compressed, non-root user, health endpoint at
`/api/health`. There is no shell or package manager inside the runtime layer, so
debug it with logs and `docker run`, not with `docker exec npm`.

## Building it yourself

Node.js 20 or newer, then `npm ci` and `npm run dev`. The image build, the test
suite and the project layout are described in
[docs/building.md](https://github.com/ena-ean/underfloor-coil-optimizer/blob/main/docs/building.md).

Source, issues and changelog:
[github.com/ena-ean/underfloor-coil-optimizer](https://github.com/ena-ean/underfloor-coil-optimizer).

MIT license.
