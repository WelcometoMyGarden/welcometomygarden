
# Path to the JSON file containing emulator ports
json_file="firebase.json"

# Parse and retrieve all ports from emulators.<any_key>.port using jq
ports=$(jq -r '.emulators | to_entries[] | .value.port' "$json_file")

# Loop through each port
for port in $ports; do
    echo "Processing port: $port"

    # Find processes using the port with lsof and filter unique PIDs
    pids=$(lsof -i tcp:"$port" -t | sort -u)

    if [ -z "$pids" ]; then
        echo "No processes found on port $port"
        continue
    fi

    # Kill each process by PID
    for pid in $pids; do
        echo "Killing process with PID: $pid"
        kill "$pid"
    done
done
