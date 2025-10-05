# NFT Marketplace

The simulation includes a lightweight marketplace for trading simple NFT objects.
Artists mint NFTs during their step and list them for sale. Collectors scan the
listings each step and purchase any NFTs they can afford with their token
balance.

Events `nft_minted`, `nft_listed`, `nft_sold` and `nft_transferred` are published
on the DAO's event bus so dashboards or analytics plugins can react in real time.

To enable NFT agents from the CLI use the `--num_artists` and
`--num_collectors` flags or modify the settings in `settings.py`.

