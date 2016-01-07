#!/bin/bash
# autostart.sh: Shell script to auto-start the Sia daemon (siad)
#
# The script tests for the following assumptions:
# 	siad is in the path
# 	the wallet directory exists in the siad path
# 	

# Get siad path
SIAAPP=$(which siad);

# Exit if siad not found
if [[ $SIAAPP = "" ]];
	then exit 1;
fi;

# Get full path of app path is a symbolic link
if test -h $SIAAPP;
	then SIAAPP=$(readlink -f $SIAAPP);
fi

# Get parent directory of siad
SIADIR=$(dirname $SIAAPP);

# Check if the /wallet directory exists
WALLETDIR="$SIADIR/wallet";
if test -d $WALLETDIR;
	then
		# Start siad in its parent directory
		siad --sia-directory=$SIADIR;
		exit 1;
	else exit 0;
fi

exit 0;