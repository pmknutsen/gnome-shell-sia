***Sia Cloud Storage Extension for GNOME Shell - BETA VERSION ***

The Sia Cloud Storage extension integrates Sia directly into your GNOME desktop. The extension automatically synchronizes files in your *Sia* folder (`~/Sia`) with the Sia cloud. Files are re-uploaded if their expire, or their file-sizes change. The extension can also automatically start the Sia daemon if it is found in your path.

**What is Sia?**
Sia is a blockchain-based decentralized cloud storage platform that allows users all over the world to contribute available storage space from their computers to form a decentralized network. Using Sia, you can rent storage from hosts on the network. This is accomplished via "smart" storage contracts stored on the Sia blockchain. Hosts are paid for storing files, oce the host has kept a file for an agreed amount of time.

Siacoins is the Sia network’s own currency, and is used to fund storage contracts. You can earn Siacoins by sharing unused storage space on your computer, or you can buy Siacoin on an exchange.

**Install**
The extension should be installed in your `~/.local/share/gnome-shell/extensions` directory.

**Features**

* View Siacoin balance and pending transfers
* Automatic synchronization of the ~/Sia folder (recursive)
* Send Siacoins
* Create address to receive funds
* Auto-start of Sia daemon
* Sync and upload statistics


**Troubleshooting**
"Local files are not synchronized"
Your wallet needs to be unlocked and funded in order for Sia to form new storage contracts with hosts. Restrictive firewalls may also prevent Sia from connecting to the cloud. If that is not the case and synchronzation has indeed stopped, try restarting the Sia daemon (`siad`).

"I do not have Siacoins, and don't know how to get them"
Siacoins is the Sia network’s own currency, and is used to fund storage contracts. You can earn Siacoins by sharing unused storage space on your computer, or you can buy Siacoins with bitcoins on an exchange, such as [Poloniex](http://poloniex.com). You can also request a small amount of free Siacoins from a faucet, such as [SiaPulse.com](http://siapulse.com/page/faucet).

"Sia does not automatically start"
To enable auto-start of the Sia daemon, the program `siad` needs to be in your path. Create a symbolic link to siad:
`sudo ln -s /path/to/siad /usr/bin/siad`

"The extension does not run"
The extension may not be compatible with your version of GNOME. Please contact the developer with details of your distribution and GNOME version and support may be added at a later time.


**License**

The MIT License (MIT)
Copyright (c) 2016 Per Knutsen <pmknutsen@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.