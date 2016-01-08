#!/bin/bash
#
# Install Sia desktop extension/applet for GNOME or Cinnamon
# 
# Dependencies: unzip
#

# Check unzip 
command -v unzip >/dev/null 2>&1 || { echo "Error: Please install unzip"; exit 1; } 

# Test which desktop is running

# Detect GNOME desktop
if [ "$DESKTOP_SESSION" = "gnome" ]; then
  EXTENSION_PATH="$HOME/.local/share/gnome-shell/extensions";
  if [ ! -d "$EXTENSION_PATH" ]; then
    echo "Error: Detected GNOME desktop but could not find extensions directory";
    exit 1;
  fi
fi

# Detect Cinnamon desktop
if [ "$DESKTOP_SESSION" = "cinnamon" ]; then
  EXTENSION_PATH="$HOME/.local/share/cinnamon/applets";
  if [ ! -d "$EXTENSION_PATH" ]; then
    echo "Error: Detected Cinnamon desktop but could not find applets directory";
    exit 1;
  fi
fi

# Set gnome shell extension site URL 
URL="https://github.com/pmknutsen/gnome-shell-sia/archive/master.zip";

# Extension UUID 
EXTENSION_UUID="sia@pmknutsen@github.com";

# Download extension archive 
wget --header='Accept-Encoding:none' -O /tmp/extension.zip "${URL}" 

# Unzip extension to installation folder 
mkdir -p "${EXTENSION_PATH}/${EXTENSION_UUID}";
unzip /tmp/extension.zip -d ${EXTENSION_PATH}/${EXTENSION_UUID};
mv ${EXTENSION_PATH}/${EXTENSION_UUID}/gnome-shell-sia-master/* ${EXTENSION_PATH}/${EXTENSION_UUID};
rmdir ${EXTENSION_PATH}/${EXTENSION_UUID}/gnome-shell-sia-master;

# List enabled extensions 
if [ "$DESKTOP_SESSION" = "gnome" ]; then
  EXTENSION_LIST=$(gsettings get org.gnome.shell enabled-extensions | sed 's/^.\(.*\).$/\1/');
fi

if [ "$DESKTOP_SESSION" = "cinnamon" ]; then
  EXTENSION_LIST=$(gsettings get org.cinnamon enabled-applets | sed 's/^.\(.*\).$/\1/');
fi

# Check if extension is already enabled
EXTENSION_ENABLED=$(echo ${EXTENSION_LIST} | grep ${EXTENSION_UUID});

if [ "$EXTENSION_ENABLED" = "" ]; then
  # Enable extension
  if [ "$DESKTOP_SESSION" = "gnome" ]; then
    gsettings set org.gnome.shell enabled-extensions "[${EXTENSION_LIST},'${EXTENSION_UUID}']" 
  fi
  if [ "$DESKTOP_SESSION" = "cinnamon" ]; then
    gsettings set org.cinnamon enabled-extensions "[${EXTENSION_LIST},'${EXTENSION_UUID}']" 
  fi

  # Extension is now available
  echo "Extension with ID ${EXTENSION_ID} has been enabled. Restart your desktop to take effect." 
fi 

# remove temporary files 
rm -f /tmp/extension.zip