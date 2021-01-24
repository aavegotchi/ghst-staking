/* global hre ethers */

async function main () {
  // const diamond = await ethers.getContractAt('DiamondLoupeFacet', '0xA02d547512Bb90002807499F05495Fe9C4C3943f')
  const diamond = await ethers.getContractAt('GHSTStakingDiamond', '0xA02d547512Bb90002807499F05495Fe9C4C3943f')
  // console.log(diamond.interface)
  // const facetInfo = await diamond.facets()
  // console.log(facetInfo)
  const constructorArgs = [
    [
      [
        '0xa253460d993418dFF9Db9552e984a1890a71737A',
        0,
        [
          '0x1f931c1c'
        ]
      ],
      [
        '0xc5fD77f43f9cc3cd58300979BbD9aad1051DB76d',
        0,
        [
          '0xcdffacc6',
          '0x52ef6b2c',
          '0xadfca15e',
          '0x7a0ed627',
          '0x01ffc9a7'
        ]
      ],
      [
        '0xAf97fb914498A81C2BEeC444e40aE676f48bd4F8',
        0,
        [
          '0x8da5cb5b',
          '0xf2fde38b'
        ]
      ],
      [
        '0x45d5b2A69b6210e9024A772FF9DA7Fe7337ee739',
        0,
        [
          '0xd097298e',
          '0xaa061d09',
          '0x4b334ef6',
          '0x0fe6ed26',
          '0xa86a1f1f',
          '0x88fa5b04',
          '0x7cee3795',
          '0x98807d84',
          '0x0a7c0cb5',
          '0xf8a6103f',
          '0xc175090b',
          '0x7bdc6db8',
          '0x9119f150',
          '0x9c0dfa01',
          '0x26064b6d',
          '0x379483c1'
        ]
      ],
      [
        '0x33B2f868317d1E7bFfBf2e3f74ebC83EF9d25BE2',
        0,
        [
          '0x00fdd58e',
          '0xfe992c98',
          '0x4e1273f4',
          '0xe985e9c5',
          '0x691d716c',
          '0x2eb2c2d6',
          '0xf242432a',
          '0xa22cb465',
          '0x55f804b3',
          '0xd068cdc5',
          '0xbd85b039',
          '0x0e89341c'
        ]
      ],
      [
        '0x1a20a1F1d6e70F46B08418d56ffD80921D75a501',
        0,
        [
          '0xdd62ed3e',
          '0x095ea7b3',
          '0x70a08231',
          '0x313ce567',
          '0xa457c2d7',
          '0x39509351',
          '0x06fdde03',
          '0x95d89b41',
          '0x18160ddd',
          '0xa9059cbb',
          '0x23b872dd'
        ]
      ]
    ],
    [
      '0x819C3fc356bb319035f9D2886fAc9E57DF0343F5',
      '0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7',
      '0x8b1fd78ad67c7da09b682c5392b65ca7caa101b9'
    ]
  ]
  console.log(diamond.interface.encodeDeploy(constructorArgs))
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
