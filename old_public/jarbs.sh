#!/bin/bash
#
# Joe's Auto-Rice Bootstrapping Scripts
#

# Constants
dotfilesrepo="https://github.com/ephjos/dotfiles.git"
progsfile="https://raw.githubusercontent.com/ephjos/JARBS/master/progs.csv"
issuefile="https://raw.githubusercontent.com/ephjos/JARBS/master/issue"
aurhelper="yay"
repobranch="master"

# Set "installpkg" to use the right package manager
if type xbps-install >/dev/null 2>&1; then
    installpkg(){ xbps-install -y "$1" >/dev/null 2>&1; }
    grepseq="\"^[PGV]*,\""
elif type apt >/dev/null 2>&1; then
    installpkg(){ apt-get install -y "$1" >/dev/null 2>&1; }
    grepseq="\"^[PGU]*,\""
else
    distro="arch"
    installpkg(){ pacman --noconfirm --needed -S "$1" >/dev/null 2>&1; }
    grepseq="\"^[PGA]*,\""
fi

# Prompting tools
infoPrompt() { read -p "$1 :"; }

prompt() {
    read -p "$1
  > " $2;
}

promptSilent() {
    read -sp "$1
  > " $2;
  echo;
}

promptRequired() {
    prompt "$1" "$2";
    while [ "${!2}" == "" ]; do
        prompt "No value provided, $1" "$2";
    done;
}

promptPassword() {
    promptSilent "$1" "$2";
    while [ "${!2}" == "" ]; do
        promptSilent "No value provided, $1" "$2";
    done;
}

error() { echo "$1"; exit; }

# Core functions
welcome() {
    clear;
    infoPrompt "Welcome to JARBS! (press enter to continue)";
    infoPrompt "Please make sure you have that latest pacman updates \
and refreshed keyrings, or else installation may fail \
(press enter to continue)";
}

getCredentials() {
    promptRequired "Please provide a username" name;
    while ! echo "$name" | grep "^[a-z_][a-z0-9_-]*$" >/dev/null 2>&1; do
        promptRequired 'Username must start with a letter or underscore,
and can only contain letters, numbers, -, and _' name;
    done;
    promptPassword "Enter a password" pass1
    promptPassword "Retype password" pass2
    while [ "$pass1" != "$pass2" ]; do
        unset pass1
        unset pass2
        promptPassword \
            "Passwords do not match, reenter a password" pass1
        promptPassword "Retype password" pass2
    done;
}

userCheck() {
    if [ -n "$(id -u "$name" 2>/dev/null)" ]; then
        prompt "This user already exists. JARBS can still try to install \
but is likely to overwrite files and break things. Do you wish to proceed? \
 [y/N]" ans
        if [ "y" != "$ans" ] && [ "Y" != "$ans" ]; then
            error "Not proceeding with overwriting user $name"
        fi
    fi
}

preinstallCheck() {
    prompt "Are you ready to start installation?\
 [y/N]" ans
    if [ "y" != "$ans" ] && [ "Y" != "$ans" ]; then
        error "Installation canceled"
    fi
}

addUser() {
    echo "Adding user $name";
    useradd -m -g wheel -s /bin/bash "$name" >/dev/null 2>&1 || \
        usermod -a -G wheel "$name" && \
        mkdir -p /home/"$name" && \
        chown "$name":wheel /home/"$name";
    repodir="/home/$name/.local/src";
    mkdir -p "$repodir";
    chown -R "$name":wheel "$(dirname "$repodir")";
    echo "$name:$pass1" | chpasswd;
    unset pass1 pass2;
}

refreshKeys() {
    echo "Refreshing arch keyring";
    pacman --noconfirm -Sy archlinux-keyring >/dev/null 2>&1;
}

installBase() {
    echo "Installing base software";
    installpkg curl;
    installpkg base-devel;
    installpkg git;
    installpkg ntp;
}

syncTime() {
    echo "Syncing system time";
    ntpdate 0.us.pool.ntp.org >/dev/null 2>&1
}

newperms() {
    sed -i "/#JARBS/d" /etc/sudoers;
    echo "$* #JARBS" >> /etc/sudoers;
}

manualinstall() {
    [ -f "/usr/bin/$1" ] || (
        echo "Installing \"$1\", an AUR helper..."
        cd /tmp || exit
        rm -rf /tmp/"$1"*
        curl -sO https://aur.archlinux.org/cgit/aur.git/snapshot/"$1".tar.gz &&
        sudo -u "$name" tar -xvf "$1".tar.gz >/dev/null 2>&1 &&
        cd "$1" &&
        sudo -u "$name" makepkg --noconfirm -si >/dev/null 2>&1
        cd /tmp || return);
}

maininstall() { # Installs all needed programs from main repo.
    echo "Installing \`$1\` ($n of $total). $1 $2"
    installpkg "$1"
}

gitmakeinstall() {
    progname="$(basename "$1" .git)"
    dir="$repodir/$progname"
    echo "Installing \`$progname\` ($n of $total) via \`git\`\
and \`make\`. $(basename "$1") $2"
    sudo -u "$name" git clone --depth 1 "$1" "$dir" >/dev/null 2>&1 || \
        { cd "$dir" || return ; \
            sudo -u "$name" git pull --force origin master;}
    cd "$dir" || exit
    make >/dev/null 2>&1
    make install >/dev/null 2>&1
    cd /tmp || return;
}

aurinstall() {
    echo "Installing \`$1\` ($n of $total) from the AUR. $1 $2"
    echo "$aurinstalled" | grep "^$1$" >/dev/null 2>&1 && return
    sudo -u "$name" $aurhelper -S --noconfirm "$1" >/dev/null 2>&1
}

pipinstall() {
    echo "Installing the Python package \`$1\` ($n of $total). $1 $2"
    command -v pip || installpkg python-pip >/dev/null 2>&1
    yes | pip install "$1"
}

archPreinstall() {
    [ -f /etc/sudoers.pacnew ] && cp /etc/sudoers.pacnew /etc/sudoers

    # Allow user to run sudo without password. Since AUR programs must be
    # installed in a fakeroot environment, this is required for all
    # builds with AUR.
    newperms "%wheel ALL=(ALL) NOPASSWD: ALL"

    # Make pacman and yay colorful and adds eye candy on the
    # progress bar because why not.
    grep "^Color" /etc/pacman.conf >/dev/null || \
        sed -i "s/^#Color$/Color/" /etc/pacman.conf
    grep "ILoveCandy" /etc/pacman.conf >/dev/null || \
        sed -i "/#VerbosePkgLists/a ILoveCandy" /etc/pacman.conf

    # Use all cores for compilation.
    sed -i "s/-j2/-j$(nproc)/;s/^#MAKEFLAGS/MAKEFLAGS/" /etc/makepkg.conf

    manualinstall $aurhelper || error "Failed to install AUR helper."
}

installationloop() {
    ([ -f "$progsfile" ] && cp "$progsfile" /tmp/progs.csv) || \
        curl -Ls "$progsfile" | sed '/^#/d' | \
        eval grep "$grepseq" > /tmp/progs.csv;
    total=$(wc -l < /tmp/progs.csv);
    aurinstalled=$(pacman -Qqm);
    while IFS=, read -r tag program comment; do
        n=$((n+1));
        echo "$comment" | grep "^\".*\"$" >/dev/null 2>&1 && \
            comment="$(echo "$comment" | sed "s/\(^\"\|\"$\)//g")";
        case "$tag" in
            "A") aurinstall "$program" "$comment" ;;
            "G") gitmakeinstall "$program" "$comment" ;;
            "P") pipinstall "$program" "$comment" ;;
            *) maininstall "$program" "$comment" ;;
        esac;
    done < /tmp/progs.csv;
}

cloneHomeDir() {
    echo "Installing dotfiles"
    putgitrepo "$dotfilesrepo" "/home/$name" "$repobranch"
    rm -rf \
        "/home/$name/README.md" \
        "/home/$name/LICENSE" \
        "/home/$name/FUNDING.yml" \
        "/home/$name/.git"
}

setIssue() {
    echo "Setting login issue"
    curl -Ls "$issuefile" > /etc/issue
}

# Downloads a gitrepo $1 and places the files in $2 only overwriting conflicts
putgitrepo() {
    [ -z "$3" ] && branch="master" || branch="$repobranch"
    dir=$(mktemp -d)
    [ ! -d "$2" ] && mkdir -p "$2"
    chown -R "$name":wheel "$dir" "$2"
    sudo -u "$name" \git clone --recursive -b "$branch" --depth 1 "$1" "$dir" \
        >/dev/null 2>&1
    sudo -u "$name" cp -rfT "$dir" "$2"
}

systemBeepOff() {
    echo "Prevent thinkpad beeping"
    if [ -n "$(lsmod | grep "\<pcspkr\>")" ]; then
        rmmod pcspkr
        echo "blacklist pcspkr" > /etc/modprobe.d/nobeep.conf;
    fi
}

finalize() {
    echo "All done! Assuming everything went well, you should be able to\
log into $name and be up and running!"
}

#
# Program beings here
#

installpkg curl || error "Are you sure you're running this as the root \
user and have an internet connection?";

welcome || error "Could not display welcome message";
getCredentials || error "Could not get username and password";
userCheck || error "Could not check if user is already set";
preinstallCheck || error "Could not verify that user is ready to proceed";
addUser || error "Error adding username and/or password.";
refreshKeys || error "Error automatically refreshing Arch keyring. \
Consider doing so manually.";
installBase || error "Error installing base programs";
syncTime || error "Error syncing system time";

[ "$distro" == "arch" ] && \
    (archPreinstall || error "Unable to execute arch pre install");

installationloop;

###
echo "Installing libxft-bgra, temporary fix";
yes | sudo -u "$name" $aurhelper -S libxft-bgra >/dev/null 2>&1;
###

cloneHomeDir || error "Error installing dotfiles"
setIssue || error "Could not set login issue"
systemBeepOff

dbus-uuidgen > /var/lib/dbus/machine-id

grep -q "laptop-updates.brave.com" /etc/hosts || \
    echo "0.0.0.0 laptop-updates.brave.com" >> /etc/hosts

# killall pulseaudio; sudo -u "$name" pulseaudio --start

[ "$distro" = arch ] && newperms "%wheel ALL=(ALL) ALL #JARBS
%wheel ALL=(ALL) NOPASSWD: /usr/bin/shutdown,\
/usr/bin/reboot,\
/usr/bin/systemctl suspend,\
/usr/bin/wifi-menu,\
/usr/bin/mount,\
/usr/bin/umount,\
/usr/bin/pacman -Syu,\
/usr/bin/pacman -Syyu,\
/usr/bin/packer -Syu,\
/usr/bin/packer -Syyu,\
/usr/bin/systemctl restart NetworkManager,\
/usr/bin/rc-service NetworkManager restart,\
/usr/bin/pacman -Syyu --noconfirm,\
/usr/bin/loadkeys,\
/usr/bin/yay,\
/usr/bin/pacman -Syyuw --noconfirm,\
/usr/bin/light"

finalize

