# Add an appropriate modified /etc/hosts file to this folder
# The sleep steps here are not sufficient, but this does outline a process
# that should work to update the hosts file in the emulator.
#
adb root
sleep 5
adb remount
sleep 5
ROOT_PATH=$(dirname $0)
# Update the local IPv4 in the hostsfile
$ROOT_PATH/setip.sh $ROOT_PATH/hosts
adb push $ROOT_PATH/hosts /etc/hosts
adb reboot
sleep 10
