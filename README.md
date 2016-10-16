##Sia Cloud Storage Extension for GNOME

The Sia Cloud Storage extension integrates Sia in the GNOME desktop. Files in `~/Sia` are automatically synchronized with the Sia cloud. Files are re-uploaded when they expire or file-sizes change. The extension automatically starts the Sia daemon when possible. Sia v.1.0.1 or newer is required.


###What is Sia?
Sia is a blockchain-based decentralized cloud storage platform that allows users all over the world to contribute available storage space from their computers to form a decentralized network. Using Sia, you can rent storage from hosts on the network. This is accomplished via "smart" storage contracts stored on the Sia blockchain. Hosts are paid for storing files, once the host has kept a file for an agreed amount of time.

Siacoins is the Sia network’s own currency, and are used to fund storage contracts. You can earn Siacoins by sharing unused storage space on your computer, or you can buy Siacoin on an exchange.

![Sia GNOME Extension](./img/screenshot-2.png)   ![Sia GNOME Extension](./img/screenshot.png)

###Features
* Recursive synchronization of local folder (`~/Sia`)
* Unlock/lock wallet
* View Siacoin balance and pending transfers
* Send Siacoins
* Create address to receive funds
* Auto-start Sia daemon (requires `siad` to be found in path)
* Sync and upload statistics
* File icon emblems/overlays that indicate upload status

###Install
Before you install, make sure you are running a recent version of Sia. This extension uses version numbers that match the latest version Sia which it has been tested for. Backward compatibility should be guaranteed after v1.0.1 but note that the extension is *no longer compatible with any version older than 1.0.1*.

Download and run the `install.sh` script, then restart your GNOME desktop with `Alt+F2` and `r`.

```
wget -O install.sh https://git.io/vu1Df
chmod +x install.sh
./install.sh
```

It is recommended that you also create a symbolic link in `/usr/bin` to your `siad` installation, so that the extension can auto-start Siad:

`sudo ln -s /path/to/siad /usr/bin/siad` (Ubuntu / Mint / Fedora)

`su -c 'ln -s /path/to/siad /usr/bin/siad'` (Debian)

Restart your desktop with `Alt+F2` and 'r' to start the extension.

###Persistence
File upload requires that you have already set an allowance through Sia. This can be done either through the graphical wallet (Sia-UI) or on the command line.

####Set allowance in graphical wallet
Run Sia-UI and unlock your wallet (on the Wallet page). Navigate to the Files pages and click Buy Storage. Follow the instructions and wait for the storage contract purchase to complete (this can take anywhere from a few to tens of minutes).

####Set allowance on command line
Navigate to the path of `siac` which is a command line tool supplied with Sia. Run:

`siac renter setallowance [amount] [period]`

`[amount]` is the amount of money that can be spent over a given period and the currency unit (e.g. `10KS` or `10000SC`)
`[period]` is the period in weeks the contract should be valid for.

Note that any amount of storage is not guaranteed when setting an allowance. You are merely reserving an amount to pay for storage and bandwidth you end up consuming on the Sia network. Any unused amount by the end of the contract is automatically refunded. Important to note is that your storage contract will also automatically renew at the end of `[period]` provided Sia is running, your wallet is unlocked and contains sufficient funds.

###Versioning
Versioning is currently not supported. Earlier versions of this extension supported versioning, but due to changes in the Sia API this feature is no longer available. Versioning will become available again when the API allows for it.


###Troubleshooting
**"My files are not uploaded to the cloud"**

You need to form storage contracts with hosts before uploading files. See above. Restrictive firewalls may also prevent Sia from connecting to the cloud. If that is not the case and synchronization has indeed halted, try restarting the Sia daemon (`siac stop`) as a last resort.

**"How do I backup files without moving them into the Sia folder?"**

You can create symbolic links to existing folders, to recursively backup these without copies these folders and their content into the Sia sync folder. You create a symbolic link on the command line like this:

`ln -s /path/to/folder ~/Sia/foldername`

As long as you create a symbolic link with `-s`, then removing these folders from the ~/Sia folder at a later time will not remove the source folder.


**"What are Siacoins and how to get them?"**

Siacoin is the Sia network’s own currency, and is used to fund storage contracts. You can earn Siacoins by sharing unused storage space on your computer, or you can buy Siacoins with bitcoins on an exchange, such as [Poloniex](http://poloniex.com). You can also request a small amount of free Siacoins from the faucet at [SiaPulse.com](http://siapulse.com/page/faucet).

**"Sia does not automatically start"**

To enable auto-start of the Sia daemon, the program `siad` needs to be in your path. See *Install* above and create a symblic link to your `siad` installation in `/usr/bin`.

**"The extension does not run"**

The extension may not be compatible with your version of GNOME. Please file an issue with details of your distribution and desktop versions. To aid troubleshooting include a copy of any error messages and warnings. You can view these error message by restarting the GNOME desktop in a terminal:

`gnome-shell --replace --display=:0.0 &`

**"Synchronization has stalled"**

This might happen if the file is temporarily not available, such as might happend if you are backing up an external drive and unmounting it for periods of time. In order to maintain the integrity of files on the network, Sia requires that the file is always available. You should only be synchronizing folders and files that are available whenever Sia is running on your computer.


###License
**The MIT License (MIT)**

*Copyright (c) 2016 Per Knutsen*

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.