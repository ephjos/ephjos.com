# ephjos.com

1. Setup ssh keys for target server
2. ssh into server
3. Download [blackholed](https://github.com/jart/cosmopolitan/blob/master/net/turfwar/blackholed.c)
4. Start blackholed daemon: `./blackholed.com -d`
5. Install `certbot`
6. Configure firewall to allow TCP on 80/443 and ssh on 22 (both on host and in OS, like UFW)
7. `./bin/set-certs`

## fonts

now using licensed fonts. gitignored per the license, will require placing file
from personal backup into repo to work. `.woff2` files go directly in
`public/`.
