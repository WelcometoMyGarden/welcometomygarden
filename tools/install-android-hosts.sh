# Add an appropriate modified /etc/hosts file to this folder (named 'hosts')
#
# The sleep steps here are not sufficient, but this does outline a process
# that should work to update the hosts file in the emulator.
#
# Find the base hosts file in Android Studio -> Device Explorer -> /etc/hosts
# Step 1: start using
ROOT_PATH=$(dirname $0)
./run-android-emu.sh
adb root
sleep 5
adb root
sleep 5
adb remount
sleep 5
# Update the local IPv4 in the hostsfile
$ROOT_PATH/setip.sh $ROOT_PATH/hosts
adb push $ROOT_PATH/hosts /etc/hosts
adb reboot
sleep 10
