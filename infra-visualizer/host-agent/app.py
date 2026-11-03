from flask import Flask, jsonify
import subprocess
import psutil

app = Flask(__name__)

@app.route('/host-info')
def host_info():
    # Docker containers ophalen
    docker_ps = subprocess.run(
        ['docker', 'ps', '--format', '{{.Names}}|{{.Status}}|{{.Image}}'],
        capture_output=True, text=True
    )
    containers = []
    for line in docker_ps.stdout.strip().split('\n'):
        if line:
            parts = line.split('|')
            if len(parts) == 3:
                name, status, image = parts
                containers.append({'name': name, 'status': status, 'image': image})

    # VM resource-gebruik
    vm_stats = {
        'cpu_percent': psutil.cpu_percent(interval=1),
        'memory_percent': psutil.virtual_memory().percent,
        'memory_total_gb': round(psutil.virtual_memory().total / (1024**3), 2),
        'memory_used_gb': round(psutil.virtual_memory().used / (1024**3), 2),
    }

    return jsonify({
        'vm': vm_stats,
        'docker_containers': containers
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=9000)
