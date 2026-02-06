type RoadCondition = "good" | "okay" | "bad";

type RoadSegment = {
  id: string;
  name: string;
  roadType: "highways" | "local" | "other";
  condition: RoadCondition;
  quality: number;
  coords: Array<[number, number]>;
};

const DEMO_ROAD_SEGMENTS: RoadSegment[] = [
  {
    "id": "demo-road-1",
    "name": "East Overland Trail",
    "roadType": "local",
    "condition": "okay",
    "quality": 76,
    "coords": [
      [
        32.486373,
        -99.712877
      ],
      [
        32.4868898,
        -99.7136752
      ],
      [
        32.4870209,
        -99.7138883
      ]
    ]
  },
  {
    "id": "demo-road-2",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 91,
    "coords": [
      [
        32.4724128,
        -99.7318284
      ],
      [
        32.4723924,
        -99.7318531
      ],
      [
        32.4723654,
        -99.7318722
      ],
      [
        32.4722973,
        -99.7318784
      ]
    ]
  },
  {
    "id": "demo-road-3",
    "name": "North 3rd Street",
    "roadType": "local",
    "condition": "good",
    "quality": 97,
    "coords": [
      [
        32.4530007,
        -99.747638
      ],
      [
        32.4530033,
        -99.748055
      ],
      [
        32.4530044,
        -99.7484363
      ],
      [
        32.4530049,
        -99.7486175
      ],
      [
        32.453006,
        -99.7490039
      ],
      [
        32.452998,
        -99.7492254
      ],
      [
        32.4530023,
        -99.7495146
      ],
      [
        32.4530022,
        -99.7495851
      ],
      [
        32.453003,
        -99.7499425
      ],
      [
        32.4530035,
        -99.7501767
      ],
      [
        32.4530088,
        -99.750767
      ]
    ]
  },
  {
    "id": "demo-road-4",
    "name": "South 14th Street",
    "roadType": "local",
    "condition": "good",
    "quality": 100,
    "coords": [
      [
        32.4315196,
        -99.7805187
      ],
      [
        32.4314154,
        -99.780888
      ]
    ]
  },
  {
    "id": "demo-road-5",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 94,
    "coords": [
      [
        32.4618318,
        -99.6883843
      ],
      [
        32.46182,
        -99.689735
      ]
    ]
  },
  {
    "id": "demo-road-6",
    "name": "East South 11th Street",
    "roadType": "local",
    "condition": "good",
    "quality": 91,
    "coords": [
      [
        32.4366232,
        -99.7115237
      ],
      [
        32.4366605,
        -99.7111984
      ],
      [
        32.4368263,
        -99.7096294
      ],
      [
        32.4368582,
        -99.7093275
      ],
      [
        32.4369779,
        -99.708195
      ]
    ]
  },
  {
    "id": "demo-road-7",
    "name": "Surrey Square",
    "roadType": "local",
    "condition": "good",
    "quality": 91,
    "coords": [
      [
        32.3915952,
        -99.7651785
      ],
      [
        32.3915742,
        -99.7652449
      ],
      [
        32.3915095,
        -99.7652851
      ],
      [
        32.3912484,
        -99.7652915
      ],
      [
        32.3912227,
        -99.7652921
      ],
      [
        32.3911108,
        -99.7652869
      ],
      [
        32.3910478,
        -99.7652624
      ],
      [
        32.3909901,
        -99.765189
      ],
      [
        32.3909761,
        -99.7651155
      ],
      [
        32.3909779,
        -99.7644561
      ],
      [
        32.3909779,
        -99.7643075
      ],
      [
        32.3910111,
        -99.7642218
      ],
      [
        32.3910636,
        -99.7641658
      ],
      [
        32.3911685,
        -99.7641029
      ],
      [
        32.3912277,
        -99.7640767
      ],
      [
        32.391261,
        -99.764062
      ],
      [
        32.391387,
        -99.764026
      ]
    ]
  },
  {
    "id": "demo-road-8",
    "name": "motorway road",
    "roadType": "highways",
    "condition": "good",
    "quality": 86,
    "coords": [
      [
        32.4901868,
        -99.7230111
      ],
      [
        32.490102,
        -99.7224439
      ]
    ]
  },
  {
    "id": "demo-road-9",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 87,
    "coords": [
      [
        32.4356034,
        -99.7414962
      ],
      [
        32.4338329,
        -99.7415057
      ]
    ]
  },
  {
    "id": "demo-road-10",
    "name": "North 15th Street",
    "roadType": "local",
    "condition": "good",
    "quality": 97,
    "coords": [
      [
        32.4664016,
        -99.7344689
      ],
      [
        32.4664535,
        -99.7350749
      ]
    ]
  },
  {
    "id": "demo-road-11",
    "name": "Columbia Drive",
    "roadType": "local",
    "condition": "bad",
    "quality": 52,
    "coords": [
      [
        32.421827,
        -99.761179
      ],
      [
        32.4218322,
        -99.7629696
      ],
      [
        32.4218429,
        -99.7634845
      ]
    ]
  },
  {
    "id": "demo-road-12",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 95,
    "coords": [
      [
        32.4707757,
        -99.7286658
      ],
      [
        32.4707851,
        -99.727836
      ],
      [
        32.4700366,
        -99.727824
      ]
    ]
  },
  {
    "id": "demo-road-13",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 99,
    "coords": [
      [
        32.4252777,
        -99.7863065
      ],
      [
        32.4252558,
        -99.7863455
      ]
    ]
  },
  {
    "id": "demo-road-14",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 97,
    "coords": [
      [
        32.4209155,
        -99.8366047
      ],
      [
        32.4209018,
        -99.8367364
      ],
      [
        32.4209106,
        -99.836814
      ],
      [
        32.4210383,
        -99.8372854
      ]
    ]
  },
  {
    "id": "demo-road-15",
    "name": "Titan Street",
    "roadType": "local",
    "condition": "good",
    "quality": 88,
    "coords": [
      [
        32.4234105,
        -99.802183
      ],
      [
        32.4230157,
        -99.8021879
      ],
      [
        32.4226251,
        -99.8021928
      ]
    ]
  },
  {
    "id": "demo-road-16",
    "name": "South 8th Street",
    "roadType": "local",
    "condition": "okay",
    "quality": 79,
    "coords": [
      [
        32.4418206,
        -99.7605063
      ],
      [
        32.441825,
        -99.7610651
      ],
      [
        32.4418269,
        -99.761632
      ]
    ]
  },
  {
    "id": "demo-road-17",
    "name": "Veterans Drive",
    "roadType": "local",
    "condition": "okay",
    "quality": 62,
    "coords": [
      [
        32.438116,
        -99.808511
      ],
      [
        32.4370726,
        -99.8085279
      ],
      [
        32.4368986,
        -99.8085244
      ],
      [
        32.4355525,
        -99.808394
      ]
    ]
  },
  {
    "id": "demo-road-18",
    "name": "Gee Street",
    "roadType": "local",
    "condition": "good",
    "quality": 91,
    "coords": [
      [
        32.469055,
        -99.694963
      ],
      [
        32.469089,
        -99.6944443
      ],
      [
        32.4691145,
        -99.6939476
      ]
    ]
  },
  {
    "id": "demo-road-19",
    "name": "Woodhaven Circle",
    "roadType": "local",
    "condition": "good",
    "quality": 89,
    "coords": [
      [
        32.4404,
        -99.7640323
      ],
      [
        32.440405,
        -99.764919
      ]
    ]
  },
  {
    "id": "demo-road-20",
    "name": "East South 7th Street",
    "roadType": "local",
    "condition": "good",
    "quality": 96,
    "coords": [
      [
        32.4416055,
        -99.7237762
      ],
      [
        32.4416071,
        -99.7235255
      ]
    ]
  },
  {
    "id": "demo-road-21",
    "name": "Crossroads Drive",
    "roadType": "local",
    "condition": "bad",
    "quality": 45,
    "coords": [
      [
        32.4045538,
        -99.7572602
      ],
      [
        32.404552,
        -99.756836
      ]
    ]
  },
  {
    "id": "demo-road-22",
    "name": "Carnation Court",
    "roadType": "local",
    "condition": "good",
    "quality": 89,
    "coords": [
      [
        32.3973657,
        -99.7695413
      ],
      [
        32.3973698,
        -99.7685143
      ]
    ]
  },
  {
    "id": "demo-road-23",
    "name": "County Road 207",
    "roadType": "local",
    "condition": "good",
    "quality": 92,
    "coords": [
      [
        32.4356116,
        -99.6299703
      ],
      [
        32.4307301,
        -99.629984
      ]
    ]
  },
  {
    "id": "demo-road-24",
    "name": "River Oaks Road",
    "roadType": "local",
    "condition": "good",
    "quality": 99,
    "coords": [
      [
        32.42911,
        -99.7734247
      ],
      [
        32.4289743,
        -99.7734735
      ],
      [
        32.42876,
        -99.7735441
      ],
      [
        32.428489,
        -99.773744
      ],
      [
        32.4281638,
        -99.7740499
      ],
      [
        32.4278491,
        -99.774302
      ],
      [
        32.4265297,
        -99.7753864
      ],
      [
        32.4263023,
        -99.7755653
      ],
      [
        32.4261145,
        -99.7757527
      ],
      [
        32.4259653,
        -99.7759128
      ],
      [
        32.4258432,
        -99.7760674
      ],
      [
        32.4257428,
        -99.7762655
      ],
      [
        32.4256234,
        -99.7765341
      ],
      [
        32.4255122,
        -99.7769302
      ],
      [
        32.425485,
        -99.7776737
      ],
      [
        32.4254823,
        -99.7780508
      ]
    ]
  },
  {
    "id": "demo-road-25",
    "name": "Wyndrock Drive",
    "roadType": "local",
    "condition": "bad",
    "quality": 44,
    "coords": [
      [
        32.4160683,
        -99.784135
      ],
      [
        32.4158275,
        -99.7841581
      ],
      [
        32.4155201,
        -99.7842477
      ],
      [
        32.4151921,
        -99.784404
      ],
      [
        32.4148668,
        -99.7845936
      ],
      [
        32.4144339,
        -99.7848293
      ],
      [
        32.413901,
        -99.7851136
      ],
      [
        32.4132836,
        -99.7854543
      ],
      [
        32.413088,
        -99.785547
      ],
      [
        32.4129816,
        -99.7855917
      ],
      [
        32.412962,
        -99.7856
      ],
      [
        32.41274,
        -99.785631
      ],
      [
        32.4126098,
        -99.7856362
      ]
    ]
  },
  {
    "id": "demo-road-26",
    "name": "Crow Street",
    "roadType": "local",
    "condition": "good",
    "quality": 96,
    "coords": [
      [
        32.4454023,
        -99.7161165
      ],
      [
        32.4442073,
        -99.7158547
      ]
    ]
  },
  {
    "id": "demo-road-27",
    "name": "Magnolia Street",
    "roadType": "local",
    "condition": "okay",
    "quality": 65,
    "coords": [
      [
        32.462074,
        -99.790391
      ],
      [
        32.465614,
        -99.790353
      ]
    ]
  },
  {
    "id": "demo-road-28",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 100,
    "coords": [
      [
        32.5326109,
        -99.7298885
      ],
      [
        32.5325902,
        -99.7299385
      ],
      [
        32.532592,
        -99.7300227
      ],
      [
        32.5326495,
        -99.7301037
      ],
      [
        32.53276,
        -99.7302017
      ],
      [
        32.5329118,
        -99.7303189
      ],
      [
        32.5329908,
        -99.7304105
      ],
      [
        32.5330189,
        -99.7304467
      ]
    ]
  },
  {
    "id": "demo-road-29",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 96,
    "coords": [
      [
        32.4906633,
        -99.8212923
      ],
      [
        32.4907852,
        -99.8207196
      ],
      [
        32.4908153,
        -99.8206483
      ],
      [
        32.4908511,
        -99.8205871
      ],
      [
        32.490897,
        -99.8205548
      ],
      [
        32.4909486,
        -99.8205293
      ],
      [
        32.4911507,
        -99.8205123
      ]
    ]
  },
  {
    "id": "demo-road-30",
    "name": "Amy Circle",
    "roadType": "local",
    "condition": "okay",
    "quality": 76,
    "coords": [
      [
        32.417453,
        -99.804392
      ],
      [
        32.4176238,
        -99.8044001
      ]
    ]
  },
  {
    "id": "demo-road-31",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 99,
    "coords": [
      [
        32.4439614,
        -99.7718138
      ],
      [
        32.4439614,
        -99.7712807
      ],
      [
        32.4438027,
        -99.7712756
      ]
    ]
  },
  {
    "id": "demo-road-32",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 100,
    "coords": [
      [
        32.4820146,
        -99.7085093
      ],
      [
        32.481922,
        -99.7087345
      ]
    ]
  },
  {
    "id": "demo-road-33",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 90,
    "coords": [
      [
        32.4015961,
        -99.7419551
      ],
      [
        32.4013853,
        -99.7419536
      ]
    ]
  },
  {
    "id": "demo-road-34",
    "name": "South 5th Street",
    "roadType": "local",
    "condition": "okay",
    "quality": 62,
    "coords": [
      [
        32.4456162,
        -99.7489725
      ],
      [
        32.4456188,
        -99.7491661
      ],
      [
        32.4456213,
        -99.7493534
      ],
      [
        32.4456234,
        -99.7495699
      ],
      [
        32.4456252,
        -99.7497677
      ],
      [
        32.4456268,
        -99.7499319
      ],
      [
        32.4456321,
        -99.7504821
      ],
      [
        32.4456321,
        -99.7511604
      ],
      [
        32.4456322,
        -99.7517819
      ],
      [
        32.4456334,
        -99.7524031
      ],
      [
        32.4456364,
        -99.7530218
      ],
      [
        32.445639,
        -99.7536166
      ],
      [
        32.4456416,
        -99.7542046
      ],
      [
        32.4456458,
        -99.7549058
      ]
    ]
  },
  {
    "id": "demo-road-35",
    "name": "Nebraska Road",
    "roadType": "local",
    "condition": "good",
    "quality": 95,
    "coords": [
      [
        32.4204579,
        -99.8155469
      ],
      [
        32.4202668,
        -99.8152844
      ],
      [
        32.4202307,
        -99.8152416
      ],
      [
        32.419804,
        -99.8147362
      ],
      [
        32.4197551,
        -99.8146783
      ]
    ]
  },
  {
    "id": "demo-road-36",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 87,
    "coords": [
      [
        32.5557999,
        -99.8293905
      ],
      [
        32.5558397,
        -99.8292344
      ],
      [
        32.5560572,
        -99.8280383
      ]
    ]
  },
  {
    "id": "demo-road-37",
    "name": "Poplar Street",
    "roadType": "local",
    "condition": "good",
    "quality": 89,
    "coords": [
      [
        32.4304262,
        -99.7397478
      ],
      [
        32.4291677,
        -99.7397146
      ],
      [
        32.4283313,
        -99.7397112
      ],
      [
        32.4278706,
        -99.7397094
      ],
      [
        32.4271932,
        -99.7397128
      ],
      [
        32.4267118,
        -99.7397152
      ],
      [
        32.4261995,
        -99.7397075
      ]
    ]
  },
  {
    "id": "demo-road-38",
    "name": "Orange Street",
    "roadType": "local",
    "condition": "good",
    "quality": 97,
    "coords": [
      [
        32.4819029,
        -99.7360596
      ],
      [
        32.485337,
        -99.736092
      ]
    ]
  },
  {
    "id": "demo-road-39",
    "name": "South 14th Street",
    "roadType": "local",
    "condition": "okay",
    "quality": 80,
    "coords": [
      [
        32.4317057,
        -99.7317907
      ],
      [
        32.4317191,
        -99.7320744
      ],
      [
        32.4317402,
        -99.7322929
      ],
      [
        32.4317776,
        -99.7324402
      ],
      [
        32.4318297,
        -99.7325452
      ],
      [
        32.4319223,
        -99.7327051
      ],
      [
        32.4320009,
        -99.7328469
      ],
      [
        32.4320814,
        -99.7330137
      ],
      [
        32.4320995,
        -99.7330995
      ],
      [
        32.4321198,
        -99.7331958
      ],
      [
        32.4321524,
        -99.733399
      ],
      [
        32.4321547,
        -99.7337351
      ],
      [
        32.4321535,
        -99.7343306
      ],
      [
        32.4321572,
        -99.7349407
      ]
    ]
  },
  {
    "id": "demo-road-40",
    "name": "South 7th Street",
    "roadType": "local",
    "condition": "good",
    "quality": 89,
    "coords": [
      [
        32.4438172,
        -99.776607
      ],
      [
        32.4438212,
        -99.7772503
      ],
      [
        32.4438301,
        -99.778687
      ],
      [
        32.4438454,
        -99.7798868
      ]
    ]
  },
  {
    "id": "demo-road-41",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 88,
    "coords": [
      [
        32.4002445,
        -99.7640511
      ],
      [
        32.4002515,
        -99.763353
      ]
    ]
  },
  {
    "id": "demo-road-42",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 91,
    "coords": [
      [
        32.4524143,
        -99.7307884
      ],
      [
        32.4534581,
        -99.7306702
      ]
    ]
  },
  {
    "id": "demo-road-43",
    "name": "residential road",
    "roadType": "local",
    "condition": "good",
    "quality": 98,
    "coords": [
      [
        32.5341942,
        -99.8164557
      ],
      [
        32.5342823,
        -99.8162393
      ],
      [
        32.5343772,
        -99.8160873
      ],
      [
        32.5347595,
        -99.8155406
      ],
      [
        32.5353199,
        -99.8147123
      ],
      [
        32.5360142,
        -99.8136919
      ]
    ]
  },
  {
    "id": "demo-road-44",
    "name": "Musgrave Trail",
    "roadType": "local",
    "condition": "good",
    "quality": 94,
    "coords": [
      [
        32.3891801,
        -99.7722598
      ],
      [
        32.3879226,
        -99.772251
      ]
    ]
  },
  {
    "id": "demo-road-45",
    "name": "Mary Lou Lane",
    "roadType": "local",
    "condition": "good",
    "quality": 100,
    "coords": [
      [
        32.3914212,
        -99.757517
      ],
      [
        32.3910521,
        -99.7574487
      ],
      [
        32.390906,
        -99.757433
      ],
      [
        32.3903316,
        -99.7574417
      ],
      [
        32.390169,
        -99.757409
      ],
      [
        32.3897806,
        -99.7572376
      ]
    ]
  },
  {
    "id": "demo-road-46",
    "name": "Winters Freeway",
    "roadType": "highways",
    "condition": "good",
    "quality": 97,
    "coords": [
      [
        32.442121,
        -99.786792
      ],
      [
        32.443617,
        -99.7867622
      ]
    ]
  },
  {
    "id": "demo-road-47",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 87,
    "coords": [
      [
        32.4744382,
        -99.7282224
      ],
      [
        32.4745831,
        -99.728231
      ]
    ]
  },
  {
    "id": "demo-road-48",
    "name": "West Overland Trail",
    "roadType": "local",
    "condition": "good",
    "quality": 99,
    "coords": [
      [
        32.467002,
        -99.819025
      ],
      [
        32.466636,
        -99.820398
      ],
      [
        32.466611,
        -99.820673
      ],
      [
        32.466593,
        -99.821023
      ],
      [
        32.466555,
        -99.821474
      ],
      [
        32.46649,
        -99.821657
      ]
    ]
  },
  {
    "id": "demo-road-49",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 94,
    "coords": [
      [
        32.4743635,
        -99.738758
      ],
      [
        32.4738224,
        -99.7387439
      ]
    ]
  },
  {
    "id": "demo-road-50",
    "name": "Trailend Drive",
    "roadType": "local",
    "condition": "good",
    "quality": 96,
    "coords": [
      [
        32.4947791,
        -99.721536
      ],
      [
        32.4965593,
        -99.7215389
      ],
      [
        32.4969238,
        -99.7215395
      ],
      [
        32.4977515,
        -99.7215475
      ]
    ]
  },
  {
    "id": "demo-road-51",
    "name": "South 16th Street",
    "roadType": "local",
    "condition": "good",
    "quality": 95,
    "coords": [
      [
        32.4302652,
        -99.7414299
      ],
      [
        32.4302497,
        -99.7432581
      ]
    ]
  },
  {
    "id": "demo-road-52",
    "name": "residential road",
    "roadType": "local",
    "condition": "good",
    "quality": 93,
    "coords": [
      [
        32.4559349,
        -99.7690965
      ],
      [
        32.455945,
        -99.7692078
      ],
      [
        32.4559627,
        -99.7692744
      ],
      [
        32.4559867,
        -99.7693296
      ],
      [
        32.4560266,
        -99.7694041
      ]
    ]
  },
  {
    "id": "demo-road-53",
    "name": "service road",
    "roadType": "other",
    "condition": "okay",
    "quality": 69,
    "coords": [
      [
        32.4133637,
        -99.7740432
      ],
      [
        32.4129515,
        -99.7735455
      ]
    ]
  },
  {
    "id": "demo-road-54",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 88,
    "coords": [
      [
        32.4647648,
        -99.7855175
      ],
      [
        32.4647609,
        -99.7856848
      ]
    ]
  },
  {
    "id": "demo-road-55",
    "name": "service road",
    "roadType": "other",
    "condition": "bad",
    "quality": 17,
    "coords": [
      [
        32.4239952,
        -99.789324
      ],
      [
        32.4240118,
        -99.7893157
      ],
      [
        32.4241025,
        -99.7892036
      ],
      [
        32.4242049,
        -99.7890059
      ],
      [
        32.4242824,
        -99.7889641
      ],
      [
        32.4243145,
        -99.7888345
      ],
      [
        32.4242878,
        -99.7887123
      ],
      [
        32.4242603,
        -99.7885866
      ],
      [
        32.4241654,
        -99.7884117
      ]
    ]
  },
  {
    "id": "demo-road-56",
    "name": "service road",
    "roadType": "other",
    "condition": "okay",
    "quality": 76,
    "coords": [
      [
        32.4623244,
        -99.8193684
      ],
      [
        32.4623036,
        -99.8194841
      ]
    ]
  },
  {
    "id": "demo-road-57",
    "name": "Catclaw Drive",
    "roadType": "local",
    "condition": "okay",
    "quality": 82,
    "coords": [
      [
        32.4102379,
        -99.7782313
      ],
      [
        32.409919,
        -99.778108
      ],
      [
        32.4097613,
        -99.7780567
      ],
      [
        32.4095623,
        -99.7779628
      ],
      [
        32.4095133,
        -99.7779332
      ],
      [
        32.409137,
        -99.777673
      ],
      [
        32.4090935,
        -99.7776389
      ],
      [
        32.4088048,
        -99.7774125
      ],
      [
        32.4087279,
        -99.7773522
      ],
      [
        32.408641,
        -99.777284
      ],
      [
        32.408569,
        -99.77723
      ],
      [
        32.4082391,
        -99.7769826
      ],
      [
        32.4081318,
        -99.7769021
      ],
      [
        32.4079853,
        -99.7767706
      ]
    ]
  },
  {
    "id": "demo-road-58",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 91,
    "coords": [
      [
        32.4144754,
        -99.8005529
      ],
      [
        32.4144684,
        -99.800378
      ]
    ]
  },
  {
    "id": "demo-road-59",
    "name": "Cedar Street",
    "roadType": "local",
    "condition": "okay",
    "quality": 72,
    "coords": [
      [
        32.4490144,
        -99.7355491
      ],
      [
        32.4492395,
        -99.7355263
      ]
    ]
  },
  {
    "id": "demo-road-60",
    "name": "Sandefer Street",
    "roadType": "local",
    "condition": "good",
    "quality": 100,
    "coords": [
      [
        32.4754388,
        -99.7404139
      ],
      [
        32.475434,
        -99.741587
      ],
      [
        32.4754328,
        -99.742749
      ],
      [
        32.4754278,
        -99.7445736
      ],
      [
        32.4754189,
        -99.7447701
      ],
      [
        32.4754012,
        -99.7449056
      ]
    ]
  },
  {
    "id": "demo-road-61",
    "name": "motorway road",
    "roadType": "highways",
    "condition": "good",
    "quality": 86,
    "coords": [
      [
        32.4904001,
        -99.7308749
      ],
      [
        32.490405,
        -99.7305189
      ],
      [
        32.4904147,
        -99.7298091
      ]
    ]
  },
  {
    "id": "demo-road-62",
    "name": "service road",
    "roadType": "other",
    "condition": "okay",
    "quality": 78,
    "coords": [
      [
        32.4678849,
        -99.6960057
      ],
      [
        32.4679384,
        -99.695794
      ]
    ]
  },
  {
    "id": "demo-road-63",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 85,
    "coords": [
      [
        32.4801701,
        -99.7695105
      ],
      [
        32.4789187,
        -99.7694512
      ]
    ]
  },
  {
    "id": "demo-road-64",
    "name": "residential road",
    "roadType": "local",
    "condition": "good",
    "quality": 87,
    "coords": [
      [
        32.547271,
        -99.622377
      ],
      [
        32.547134,
        -99.622241
      ],
      [
        32.545027,
        -99.622267
      ],
      [
        32.543583,
        -99.622185
      ],
      [
        32.543469,
        -99.622023
      ]
    ]
  },
  {
    "id": "demo-road-65",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 90,
    "coords": [
      [
        32.4112541,
        -99.8445847
      ],
      [
        32.410034,
        -99.844354
      ]
    ]
  },
  {
    "id": "demo-road-66",
    "name": "Gathright Drive",
    "roadType": "local",
    "condition": "good",
    "quality": 100,
    "coords": [
      [
        32.3900152,
        -99.7526086
      ],
      [
        32.389777,
        -99.752557
      ],
      [
        32.389694,
        -99.752527
      ],
      [
        32.3895727,
        -99.7524381
      ],
      [
        32.3895158,
        -99.7523663
      ],
      [
        32.3894565,
        -99.7522823
      ],
      [
        32.389365,
        -99.752124
      ],
      [
        32.3893922,
        -99.7519582
      ],
      [
        32.3893996,
        -99.7512978
      ],
      [
        32.389391,
        -99.747766
      ]
    ]
  },
  {
    "id": "demo-road-67",
    "name": "New Territory Drive",
    "roadType": "local",
    "condition": "bad",
    "quality": 15,
    "coords": [
      [
        32.4874734,
        -99.6839165
      ],
      [
        32.4873645,
        -99.6842405
      ],
      [
        32.4873553,
        -99.6842721
      ],
      [
        32.4872286,
        -99.6847091
      ]
    ]
  },
  {
    "id": "demo-road-68",
    "name": "East South 11th Street",
    "roadType": "local",
    "condition": "good",
    "quality": 95,
    "coords": [
      [
        32.4369619,
        -99.6994386
      ],
      [
        32.4369401,
        -99.6990227
      ],
      [
        32.4369227,
        -99.6986559
      ],
      [
        32.4368627,
        -99.6980721
      ],
      [
        32.4367506,
        -99.6971316
      ],
      [
        32.4366634,
        -99.6965552
      ],
      [
        32.4362703,
        -99.6945477
      ]
    ]
  },
  {
    "id": "demo-road-69",
    "name": "North 6th Street",
    "roadType": "local",
    "condition": "okay",
    "quality": 75,
    "coords": [
      [
        32.4552889,
        -99.7588985
      ],
      [
        32.4552848,
        -99.7583732
      ],
      [
        32.4552808,
        -99.7578582
      ]
    ]
  },
  {
    "id": "demo-road-70",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 89,
    "coords": [
      [
        32.4802468,
        -99.6969549
      ],
      [
        32.4796048,
        -99.6969524
      ]
    ]
  },
  {
    "id": "demo-road-71",
    "name": "Victoria Street",
    "roadType": "local",
    "condition": "good",
    "quality": 99,
    "coords": [
      [
        32.4894181,
        -99.7432125
      ],
      [
        32.4900661,
        -99.7432009
      ]
    ]
  },
  {
    "id": "demo-road-72",
    "name": "Spykes Road",
    "roadType": "local",
    "condition": "good",
    "quality": 97,
    "coords": [
      [
        32.5091396,
        -99.7099115
      ],
      [
        32.5096401,
        -99.7100131
      ],
      [
        32.5136958,
        -99.7100253
      ]
    ]
  },
  {
    "id": "demo-road-73",
    "name": "West Stamford Street",
    "roadType": "local",
    "condition": "okay",
    "quality": 68,
    "coords": [
      [
        32.462324,
        -99.833971
      ],
      [
        32.4629721,
        -99.8315956
      ]
    ]
  },
  {
    "id": "demo-road-74",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 90,
    "coords": [
      [
        32.4225531,
        -99.7532357
      ],
      [
        32.4225578,
        -99.7556907
      ]
    ]
  },
  {
    "id": "demo-road-75",
    "name": "Amarillo Street",
    "roadType": "local",
    "condition": "good",
    "quality": 90,
    "coords": [
      [
        32.4393536,
        -99.7467172
      ],
      [
        32.4374509,
        -99.746735
      ],
      [
        32.4373809,
        -99.7467357
      ],
      [
        32.4373107,
        -99.7467368
      ],
      [
        32.4357554,
        -99.7467617
      ],
      [
        32.4345816,
        -99.7467543
      ],
      [
        32.433204,
        -99.7467543
      ]
    ]
  },
  {
    "id": "demo-road-76",
    "name": "South Clack Street",
    "roadType": "local",
    "condition": "good",
    "quality": 100,
    "coords": [
      [
        32.4420461,
        -99.7874003
      ],
      [
        32.4419473,
        -99.7873919
      ],
      [
        32.4416368,
        -99.7873657
      ],
      [
        32.4415617,
        -99.7873635
      ],
      [
        32.4411387,
        -99.7873512
      ],
      [
        32.4401188,
        -99.7873657
      ]
    ]
  },
  {
    "id": "demo-road-77",
    "name": "West Highway 80",
    "roadType": "highways",
    "condition": "good",
    "quality": 94,
    "coords": [
      [
        32.455078,
        -99.839365
      ],
      [
        32.454797,
        -99.838487
      ],
      [
        32.454734,
        -99.838182
      ],
      [
        32.454634,
        -99.837648
      ],
      [
        32.4545937,
        -99.8372197
      ],
      [
        32.4545336,
        -99.8366847
      ],
      [
        32.4545036,
        -99.8362103
      ],
      [
        32.4544781,
        -99.8358033
      ],
      [
        32.4544978,
        -99.8353164
      ],
      [
        32.4545445,
        -99.8347715
      ],
      [
        32.4546318,
        -99.8339922
      ],
      [
        32.4547214,
        -99.8333659
      ],
      [
        32.4548413,
        -99.8325564
      ]
    ]
  },
  {
    "id": "demo-road-78",
    "name": "South Pioneer Drive",
    "roadType": "local",
    "condition": "good",
    "quality": 88,
    "coords": [
      [
        32.4442505,
        -99.7798388
      ],
      [
        32.4443413,
        -99.7798288
      ],
      [
        32.4448235,
        -99.7797757
      ],
      [
        32.4453006,
        -99.7797196
      ],
      [
        32.4454017,
        -99.7797077
      ],
      [
        32.445782,
        -99.779663
      ],
      [
        32.4460367,
        -99.7796273
      ],
      [
        32.4462481,
        -99.7795977
      ],
      [
        32.4467223,
        -99.7795419
      ],
      [
        32.447128,
        -99.7794865
      ],
      [
        32.4472286,
        -99.7794707
      ],
      [
        32.4476653,
        -99.7794124
      ],
      [
        32.4481979,
        -99.7793488
      ],
      [
        32.4483568,
        -99.7793357
      ],
      [
        32.4486697,
        -99.779298
      ]
    ]
  },
  {
    "id": "demo-road-79",
    "name": "service road",
    "roadType": "other",
    "condition": "bad",
    "quality": 41,
    "coords": [
      [
        32.4493409,
        -99.7149503
      ],
      [
        32.4493742,
        -99.715033
      ],
      [
        32.4495005,
        -99.715024
      ],
      [
        32.4496685,
        -99.7150119
      ],
      [
        32.4497643,
        -99.715005
      ],
      [
        32.4498331,
        -99.7149735
      ],
      [
        32.4498557,
        -99.7149631
      ],
      [
        32.4498865,
        -99.714949
      ],
      [
        32.4499811,
        -99.7148789
      ],
      [
        32.4501348,
        -99.7148649
      ],
      [
        32.4500905,
        -99.7142255
      ]
    ]
  },
  {
    "id": "demo-road-80",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 94,
    "coords": [
      [
        32.3977225,
        -99.7625816
      ],
      [
        32.3975288,
        -99.7625833
      ],
      [
        32.3974828,
        -99.7625837
      ]
    ]
  },
  {
    "id": "demo-road-81",
    "name": "East Stamford Street",
    "roadType": "local",
    "condition": "bad",
    "quality": 14,
    "coords": [
      [
        32.460323,
        -99.677087
      ],
      [
        32.459742,
        -99.676401
      ],
      [
        32.4589,
        -99.675348
      ],
      [
        32.457645,
        -99.673738
      ],
      [
        32.4572093,
        -99.6731702
      ]
    ]
  },
  {
    "id": "demo-road-82",
    "name": "Petroleum Street",
    "roadType": "other",
    "condition": "okay",
    "quality": 76,
    "coords": [
      [
        32.5478174,
        -99.7676609
      ],
      [
        32.5482441,
        -99.7677159
      ],
      [
        32.5483382,
        -99.7677203
      ],
      [
        32.5483832,
        -99.7677015
      ],
      [
        32.5484208,
        -99.7676706
      ],
      [
        32.5484592,
        -99.7675973
      ],
      [
        32.5484977,
        -99.7674954
      ],
      [
        32.548673,
        -99.766721
      ],
      [
        32.5486724,
        -99.7666511
      ],
      [
        32.5486564,
        -99.7665832
      ],
      [
        32.5486151,
        -99.766514
      ],
      [
        32.5485653,
        -99.766467
      ],
      [
        32.5465202,
        -99.7646376
      ]
    ]
  },
  {
    "id": "demo-road-83",
    "name": "South 1st Street",
    "roadType": "highways",
    "condition": "bad",
    "quality": 41,
    "coords": [
      [
        32.4482442,
        -99.7281243
      ],
      [
        32.4482915,
        -99.7285148
      ],
      [
        32.4483786,
        -99.7299578
      ],
      [
        32.4484737,
        -99.7312011
      ],
      [
        32.4485265,
        -99.731976
      ]
    ]
  },
  {
    "id": "demo-road-84",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 88,
    "coords": [
      [
        32.4349592,
        -99.6900397
      ],
      [
        32.434951,
        -99.6900922
      ]
    ]
  },
  {
    "id": "demo-road-85",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 96,
    "coords": [
      [
        32.4665366,
        -99.6833623
      ],
      [
        32.4668049,
        -99.6830691
      ],
      [
        32.4671385,
        -99.6827629
      ],
      [
        32.467515,
        -99.682516
      ],
      [
        32.4676588,
        -99.6824605
      ],
      [
        32.4677721,
        -99.6824511
      ],
      [
        32.4678182,
        -99.6824816
      ],
      [
        32.4680202,
        -99.6827805
      ]
    ]
  },
  {
    "id": "demo-road-86",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 100,
    "coords": [
      [
        32.4687085,
        -99.7765605
      ],
      [
        32.4688593,
        -99.7766221
      ],
      [
        32.469062,
        -99.776542
      ],
      [
        32.4691868,
        -99.7763941
      ],
      [
        32.4694728,
        -99.7760121
      ],
      [
        32.4696963,
        -99.7757286
      ],
      [
        32.4698159,
        -99.7755807
      ],
      [
        32.470185,
        -99.7753589
      ],
      [
        32.4703825,
        -99.775248
      ],
      [
        32.4707359,
        -99.7751927
      ]
    ]
  },
  {
    "id": "demo-road-87",
    "name": "North 9th Street",
    "roadType": "local",
    "condition": "bad",
    "quality": 54,
    "coords": [
      [
        32.4599149,
        -99.7466127
      ],
      [
        32.459914,
        -99.7472604
      ],
      [
        32.4599131,
        -99.7478406
      ],
      [
        32.4599171,
        -99.7485004
      ],
      [
        32.4599205,
        -99.7490686
      ]
    ]
  },
  {
    "id": "demo-road-88",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 93,
    "coords": [
      [
        32.4315423,
        -99.7823078
      ],
      [
        32.4315378,
        -99.7819008
      ]
    ]
  },
  {
    "id": "demo-road-89",
    "name": "service road",
    "roadType": "other",
    "condition": "okay",
    "quality": 70,
    "coords": [
      [
        32.4082902,
        -99.7718101
      ],
      [
        32.407569,
        -99.7718195
      ]
    ]
  },
  {
    "id": "demo-road-90",
    "name": "service road",
    "roadType": "other",
    "condition": "okay",
    "quality": 66,
    "coords": [
      [
        32.4344753,
        -99.7560095
      ],
      [
        32.434012,
        -99.7560334
      ]
    ]
  },
  {
    "id": "demo-road-91",
    "name": "residential road",
    "roadType": "local",
    "condition": "good",
    "quality": 96,
    "coords": [
      [
        32.4054327,
        -99.7116402
      ],
      [
        32.4049167,
        -99.7118889
      ]
    ]
  },
  {
    "id": "demo-road-92",
    "name": "South 25th Street",
    "roadType": "local",
    "condition": "good",
    "quality": 92,
    "coords": [
      [
        32.4191917,
        -99.7331233
      ],
      [
        32.4191862,
        -99.7336573
      ]
    ]
  },
  {
    "id": "demo-road-93",
    "name": "Sweetwater Lane",
    "roadType": "local",
    "condition": "good",
    "quality": 93,
    "coords": [
      [
        32.4275623,
        -99.7199232
      ],
      [
        32.4260407,
        -99.719934
      ],
      [
        32.4252785,
        -99.7199388
      ]
    ]
  },
  {
    "id": "demo-road-94",
    "name": "Santa Barbara Drive",
    "roadType": "local",
    "condition": "good",
    "quality": 90,
    "coords": [
      [
        32.5017731,
        -99.7602973
      ],
      [
        32.502101,
        -99.760255
      ]
    ]
  },
  {
    "id": "demo-road-95",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 93,
    "coords": [
      [
        32.4191692,
        -99.7186108
      ],
      [
        32.4194575,
        -99.7185686
      ]
    ]
  },
  {
    "id": "demo-road-96",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 89,
    "coords": [
      [
        32.4359673,
        -99.7818352
      ],
      [
        32.4380174,
        -99.7818119
      ]
    ]
  },
  {
    "id": "demo-road-97",
    "name": "Swenson Street",
    "roadType": "local",
    "condition": "good",
    "quality": 89,
    "coords": [
      [
        32.487966,
        -99.740261
      ],
      [
        32.4884146,
        -99.7402597
      ],
      [
        32.4888629,
        -99.7402585
      ]
    ]
  },
  {
    "id": "demo-road-98",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 98,
    "coords": [
      [
        32.4136008,
        -99.7783089
      ],
      [
        32.4132664,
        -99.7783168
      ]
    ]
  },
  {
    "id": "demo-road-99",
    "name": "Patsye Ann Cove",
    "roadType": "local",
    "condition": "okay",
    "quality": 71,
    "coords": [
      [
        32.3884753,
        -99.7487061
      ],
      [
        32.3874781,
        -99.7488113
      ]
    ]
  },
  {
    "id": "demo-road-100",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 92,
    "coords": [
      [
        32.4057825,
        -99.8084294
      ],
      [
        32.4047212,
        -99.8066023
      ],
      [
        32.4046796,
        -99.8064853
      ],
      [
        32.404627,
        -99.8063604
      ]
    ]
  },
  {
    "id": "demo-road-101",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 96,
    "coords": [
      [
        32.4622597,
        -99.7230629
      ],
      [
        32.4623112,
        -99.7230548
      ],
      [
        32.4627914,
        -99.7230548
      ]
    ]
  },
  {
    "id": "demo-road-102",
    "name": "Cherokee Circle",
    "roadType": "local",
    "condition": "bad",
    "quality": 20,
    "coords": [
      [
        32.5587373,
        -99.6873415
      ],
      [
        32.5589783,
        -99.687276
      ],
      [
        32.5591345,
        -99.687199
      ],
      [
        32.5593171,
        -99.6870478
      ],
      [
        32.5594568,
        -99.6868335
      ],
      [
        32.5595927,
        -99.6865187
      ],
      [
        32.5597007,
        -99.686159
      ],
      [
        32.5597615,
        -99.6858663
      ],
      [
        32.5597816,
        -99.685584
      ],
      [
        32.5597167,
        -99.6852934
      ],
      [
        32.5596143,
        -99.6850651
      ],
      [
        32.5586692,
        -99.6836626
      ]
    ]
  },
  {
    "id": "demo-road-103",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 99,
    "coords": [
      [
        32.4014691,
        -99.7602365
      ],
      [
        32.400626,
        -99.7612669
      ]
    ]
  },
  {
    "id": "demo-road-104",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 87,
    "coords": [
      [
        32.4247137,
        -99.8372652
      ],
      [
        32.4246627,
        -99.8375813
      ],
      [
        32.4246258,
        -99.83781
      ],
      [
        32.4251692,
        -99.8379294
      ],
      [
        32.4252069,
        -99.8377035
      ],
      [
        32.4252587,
        -99.8373939
      ]
    ]
  },
  {
    "id": "demo-road-105",
    "name": "service road",
    "roadType": "other",
    "condition": "bad",
    "quality": 11,
    "coords": [
      [
        32.5334064,
        -99.7271832
      ],
      [
        32.5334357,
        -99.7272109
      ],
      [
        32.5334441,
        -99.7272557
      ],
      [
        32.5334536,
        -99.7278959
      ],
      [
        32.5334483,
        -99.7280914
      ],
      [
        32.5334137,
        -99.7281226
      ],
      [
        32.5331186,
        -99.7281824
      ],
      [
        32.5329978,
        -99.7282011
      ]
    ]
  },
  {
    "id": "demo-road-106",
    "name": "North Treadaway Boulevard",
    "roadType": "highways",
    "condition": "good",
    "quality": 90,
    "coords": [
      [
        32.455241,
        -99.726137
      ],
      [
        32.4556743,
        -99.7260966
      ],
      [
        32.4560686,
        -99.7260598
      ],
      [
        32.4569097,
        -99.7259773
      ],
      [
        32.4579027,
        -99.7258801
      ],
      [
        32.4595385,
        -99.7257197
      ],
      [
        32.4600179,
        -99.7256727
      ]
    ]
  },
  {
    "id": "demo-road-107",
    "name": "South 24th Street",
    "roadType": "local",
    "condition": "good",
    "quality": 89,
    "coords": [
      [
        32.4202813,
        -99.7487217
      ],
      [
        32.4202922,
        -99.7493889
      ]
    ]
  },
  {
    "id": "demo-road-108",
    "name": "primary road",
    "roadType": "highways",
    "condition": "bad",
    "quality": 48,
    "coords": [
      [
        32.4826419,
        -99.6889359
      ],
      [
        32.4827444,
        -99.6890015
      ]
    ]
  },
  {
    "id": "demo-road-109",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 100,
    "coords": [
      [
        32.4274368,
        -99.7665394
      ],
      [
        32.4270193,
        -99.7665421
      ]
    ]
  },
  {
    "id": "demo-road-110",
    "name": "Jake Roberts Freeway",
    "roadType": "highways",
    "condition": "bad",
    "quality": 19,
    "coords": [
      [
        32.451784,
        -99.683298
      ],
      [
        32.45057,
        -99.683374
      ],
      [
        32.449447,
        -99.683359
      ]
    ]
  },
  {
    "id": "demo-road-111",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 87,
    "coords": [
      [
        32.4638966,
        -99.703959
      ],
      [
        32.4639,
        -99.7043273
      ]
    ]
  },
  {
    "id": "demo-road-112",
    "name": "Hickory Street",
    "roadType": "local",
    "condition": "good",
    "quality": 92,
    "coords": [
      [
        32.4678305,
        -99.734927
      ],
      [
        32.467996,
        -99.734911
      ],
      [
        32.4684787,
        -99.7348767
      ],
      [
        32.4685929,
        -99.7348687
      ],
      [
        32.4690357,
        -99.7348715
      ],
      [
        32.4700318,
        -99.7348668
      ],
      [
        32.470811,
        -99.7348595
      ],
      [
        32.4708568,
        -99.734859
      ],
      [
        32.470872,
        -99.7348589
      ],
      [
        32.4711654,
        -99.7348581
      ],
      [
        32.471559,
        -99.734857
      ],
      [
        32.4716003,
        -99.7348563
      ],
      [
        32.4717661,
        -99.7348573
      ],
      [
        32.4721319,
        -99.7348548
      ],
      [
        32.4723712,
        -99.7348541
      ],
      [
        32.4728124,
        -99.7348484
      ],
      [
        32.4730028,
        -99.734846
      ],
      [
        32.4731418,
        -99.7348463
      ]
    ]
  },
  {
    "id": "demo-road-113",
    "name": "service road",
    "roadType": "other",
    "condition": "okay",
    "quality": 75,
    "coords": [
      [
        32.4592912,
        -99.7771109
      ],
      [
        32.459229,
        -99.7769044
      ]
    ]
  },
  {
    "id": "demo-road-114",
    "name": "County Road 108",
    "roadType": "local",
    "condition": "good",
    "quality": 99,
    "coords": [
      [
        32.4453408,
        -99.6191294
      ],
      [
        32.4453407,
        -99.6194686
      ],
      [
        32.4453405,
        -99.6200225
      ],
      [
        32.4453384,
        -99.6214889
      ],
      [
        32.4453364,
        -99.6216911
      ],
      [
        32.4453309,
        -99.622254
      ],
      [
        32.4453318,
        -99.6228593
      ]
    ]
  },
  {
    "id": "demo-road-115",
    "name": "service road",
    "roadType": "other",
    "condition": "okay",
    "quality": 67,
    "coords": [
      [
        32.4106189,
        -99.7541637
      ],
      [
        32.4106218,
        -99.754037
      ],
      [
        32.410609,
        -99.753847
      ]
    ]
  },
  {
    "id": "demo-road-116",
    "name": "Dub Wright Boulevard",
    "roadType": "highways",
    "condition": "good",
    "quality": 97,
    "coords": [
      [
        32.4057178,
        -99.8047619
      ],
      [
        32.4043348,
        -99.8031957
      ],
      [
        32.4034488,
        -99.8021983
      ],
      [
        32.4032489,
        -99.801889
      ]
    ]
  },
  {
    "id": "demo-road-117",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 99,
    "coords": [
      [
        32.4743512,
        -99.7267598
      ],
      [
        32.4739279,
        -99.7265664
      ]
    ]
  },
  {
    "id": "demo-road-118",
    "name": "Amarillo Street",
    "roadType": "local",
    "condition": "okay",
    "quality": 80,
    "coords": [
      [
        32.4151786,
        -99.74684
      ],
      [
        32.4150345,
        -99.7469162
      ],
      [
        32.414544,
        -99.746916
      ],
      [
        32.4140556,
        -99.7469079
      ],
      [
        32.412211,
        -99.746919
      ]
    ]
  },
  {
    "id": "demo-road-119",
    "name": "Avenue B",
    "roadType": "other",
    "condition": "okay",
    "quality": 77,
    "coords": [
      [
        32.4251554,
        -99.8461824
      ],
      [
        32.4251937,
        -99.845956
      ]
    ]
  },
  {
    "id": "demo-road-120",
    "name": "North Willis Street",
    "roadType": "local",
    "condition": "good",
    "quality": 86,
    "coords": [
      [
        32.4770608,
        -99.7657474
      ],
      [
        32.4773294,
        -99.765695
      ],
      [
        32.4775873,
        -99.765588
      ],
      [
        32.4776455,
        -99.7655541
      ],
      [
        32.4780693,
        -99.7653124
      ],
      [
        32.47834,
        -99.7651882
      ],
      [
        32.4785372,
        -99.7651525
      ],
      [
        32.478743,
        -99.765122
      ]
    ]
  },
  {
    "id": "demo-road-121",
    "name": "Highland Avenue",
    "roadType": "local",
    "condition": "good",
    "quality": 100,
    "coords": [
      [
        32.4220833,
        -99.7493708
      ],
      [
        32.4219466,
        -99.7493722
      ],
      [
        32.4210713,
        -99.749381
      ],
      [
        32.4203356,
        -99.7493885
      ],
      [
        32.4202922,
        -99.7493889
      ],
      [
        32.419638,
        -99.7493956
      ],
      [
        32.4194953,
        -99.7493529
      ],
      [
        32.4193089,
        -99.7492393
      ]
    ]
  },
  {
    "id": "demo-road-122",
    "name": "service road",
    "roadType": "other",
    "condition": "okay",
    "quality": 61,
    "coords": [
      [
        32.3825372,
        -99.7456839
      ],
      [
        32.3817444,
        -99.7456839
      ]
    ]
  },
  {
    "id": "demo-road-123",
    "name": "Cypress Street",
    "roadType": "local",
    "condition": "bad",
    "quality": 53,
    "coords": [
      [
        32.4536737,
        -99.7338711
      ],
      [
        32.4546195,
        -99.7337832
      ]
    ]
  },
  {
    "id": "demo-road-124",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 92,
    "coords": [
      [
        32.4352322,
        -99.6907766
      ],
      [
        32.4340892,
        -99.6899112
      ]
    ]
  },
  {
    "id": "demo-road-125",
    "name": "Avenue E",
    "roadType": "local",
    "condition": "good",
    "quality": 89,
    "coords": [
      [
        32.4122997,
        -99.8418034
      ],
      [
        32.4126808,
        -99.839586
      ]
    ]
  },
  {
    "id": "demo-road-126",
    "name": "State Street",
    "roadType": "local",
    "condition": "good",
    "quality": 96,
    "coords": [
      [
        32.458918,
        -99.7426315
      ],
      [
        32.4589206,
        -99.7432052
      ],
      [
        32.4589223,
        -99.7435914
      ],
      [
        32.458925,
        -99.7441894
      ],
      [
        32.4589283,
        -99.7448099
      ],
      [
        32.4589314,
        -99.7453875
      ],
      [
        32.4589344,
        -99.7460436
      ],
      [
        32.458937,
        -99.746622
      ],
      [
        32.4589454,
        -99.7472835
      ],
      [
        32.4589528,
        -99.7478601
      ],
      [
        32.4589485,
        -99.7485072
      ],
      [
        32.4589434,
        -99.7490875
      ],
      [
        32.4589498,
        -99.7497475
      ]
    ]
  },
  {
    "id": "demo-road-127",
    "name": "service road",
    "roadType": "other",
    "condition": "okay",
    "quality": 75,
    "coords": [
      [
        32.4324087,
        -99.7919333
      ],
      [
        32.4312284,
        -99.7929407
      ],
      [
        32.4312157,
        -99.7917832
      ],
      [
        32.4323791,
        -99.7911796
      ]
    ]
  },
  {
    "id": "demo-road-128",
    "name": "Spyglass Hill Court",
    "roadType": "local",
    "condition": "good",
    "quality": 96,
    "coords": [
      [
        32.3818832,
        -99.7528171
      ],
      [
        32.3818748,
        -99.7512559
      ]
    ]
  },
  {
    "id": "demo-road-129",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 96,
    "coords": [
      [
        32.4358934,
        -99.7952466
      ],
      [
        32.4359155,
        -99.7950142
      ],
      [
        32.4359463,
        -99.7946915
      ],
      [
        32.4359567,
        -99.7945819
      ]
    ]
  },
  {
    "id": "demo-road-130",
    "name": "County Road 319",
    "roadType": "local",
    "condition": "okay",
    "quality": 71,
    "coords": [
      [
        32.3759167,
        -99.8351315
      ],
      [
        32.3782508,
        -99.8355976
      ],
      [
        32.3819432,
        -99.8363214
      ]
    ]
  },
  {
    "id": "demo-road-131",
    "name": "Plum Street",
    "roadType": "local",
    "condition": "okay",
    "quality": 63,
    "coords": [
      [
        32.493795,
        -99.7273671
      ],
      [
        32.494807,
        -99.727365
      ]
    ]
  },
  {
    "id": "demo-road-132",
    "name": "Stonegate Road",
    "roadType": "local",
    "condition": "good",
    "quality": 96,
    "coords": [
      [
        32.397635,
        -99.759058
      ],
      [
        32.397478,
        -99.759149
      ],
      [
        32.3972938,
        -99.759152
      ]
    ]
  },
  {
    "id": "demo-road-133",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 97,
    "coords": [
      [
        32.4462171,
        -99.811601
      ],
      [
        32.4462308,
        -99.8152819
      ]
    ]
  },
  {
    "id": "demo-road-134",
    "name": "Mall of Abilene",
    "roadType": "other",
    "condition": "good",
    "quality": 86,
    "coords": [
      [
        32.3999522,
        -99.7642315
      ],
      [
        32.3999695,
        -99.7642314
      ],
      [
        32.4000339,
        -99.7642323
      ],
      [
        32.4001015,
        -99.7642308
      ],
      [
        32.4001371,
        -99.7642308
      ],
      [
        32.4003002,
        -99.7642308
      ],
      [
        32.4004026,
        -99.7642309
      ],
      [
        32.4005385,
        -99.7642307
      ],
      [
        32.4007063,
        -99.7642256
      ],
      [
        32.4007468,
        -99.7642251
      ],
      [
        32.4008526,
        -99.7642239
      ],
      [
        32.4010003,
        -99.7642222
      ],
      [
        32.4011557,
        -99.7642205
      ],
      [
        32.4013071,
        -99.7642187
      ],
      [
        32.4014574,
        -99.764217
      ],
      [
        32.4016013,
        -99.7642154
      ],
      [
        32.4017535,
        -99.7642137
      ],
      [
        32.4018732,
        -99.7642123
      ],
      [
        32.401917,
        -99.7642118
      ],
      [
        32.4020323,
        -99.7642105
      ],
      [
        32.402219,
        -99.7642083
      ],
      [
        32.4023138,
        -99.7642072
      ],
      [
        32.4023622,
        -99.7642
      ],
      [
        32.4024342,
        -99.7641892
      ],
      [
        32.4024625,
        -99.7641714
      ],
      [
        32.4025036,
        -99.7641455
      ],
      [
        32.4025521,
        -99.7641149
      ],
      [
        32.4026392,
        -99.764015
      ],
      [
        32.4026553,
        -99.7639917
      ],
      [
        32.4027852,
        -99.7638306
      ],
      [
        32.4028035,
        -99.7638123
      ],
      [
        32.4028621,
        -99.7637537
      ],
      [
        32.4029506,
        -99.7637439
      ]
    ]
  },
  {
    "id": "demo-road-135",
    "name": "South FM 707",
    "roadType": "local",
    "condition": "good",
    "quality": 90,
    "coords": [
      [
        32.4286768,
        -99.8642035
      ],
      [
        32.4288281,
        -99.8642035
      ],
      [
        32.4289637,
        -99.8642092
      ],
      [
        32.4291174,
        -99.864222
      ],
      [
        32.4292879,
        -99.8642462
      ],
      [
        32.42945,
        -99.864276
      ],
      [
        32.429615,
        -99.8643173
      ],
      [
        32.4353094,
        -99.8659429
      ]
    ]
  },
  {
    "id": "demo-road-136",
    "name": "trunk_link road",
    "roadType": "other",
    "condition": "good",
    "quality": 100,
    "coords": [
      [
        32.4521226,
        -99.7849705
      ],
      [
        32.4516759,
        -99.7850315
      ]
    ]
  },
  {
    "id": "demo-road-137",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 91,
    "coords": [
      [
        32.4328831,
        -99.7674493
      ],
      [
        32.4328849,
        -99.7676017
      ]
    ]
  },
  {
    "id": "demo-road-138",
    "name": "Deer Run Drive",
    "roadType": "local",
    "condition": "bad",
    "quality": 6,
    "coords": [
      [
        32.5006246,
        -99.7619362
      ],
      [
        32.4999916,
        -99.7621662
      ]
    ]
  },
  {
    "id": "demo-road-139",
    "name": "residential road",
    "roadType": "local",
    "condition": "bad",
    "quality": 35,
    "coords": [
      [
        32.4162791,
        -99.8056251
      ],
      [
        32.4162799,
        -99.804507
      ]
    ]
  },
  {
    "id": "demo-road-140",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 87,
    "coords": [
      [
        32.4530955,
        -99.7672114
      ],
      [
        32.4530243,
        -99.7676693
      ]
    ]
  },
  {
    "id": "demo-road-141",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 87,
    "coords": [
      [
        32.4802505,
        -99.697881
      ],
      [
        32.4791569,
        -99.6978824
      ]
    ]
  },
  {
    "id": "demo-road-142",
    "name": "motorway_link road",
    "roadType": "other",
    "condition": "good",
    "quality": 90,
    "coords": [
      [
        32.4814712,
        -99.7063016
      ],
      [
        32.4813949,
        -99.7060156
      ]
    ]
  },
  {
    "id": "demo-road-143",
    "name": "service road",
    "roadType": "other",
    "condition": "bad",
    "quality": 59,
    "coords": [
      [
        32.4919981,
        -99.6907225
      ],
      [
        32.4920011,
        -99.6903528
      ],
      [
        32.4919817,
        -99.6902946
      ],
      [
        32.4919267,
        -99.6902628
      ],
      [
        32.491815,
        -99.6902628
      ],
      [
        32.4917421,
        -99.6903087
      ],
      [
        32.4917182,
        -99.6904058
      ],
      [
        32.4917154,
        -99.6907252
      ]
    ]
  },
  {
    "id": "demo-road-144",
    "name": "4th Street",
    "roadType": "local",
    "condition": "good",
    "quality": 100,
    "coords": [
      [
        32.415531,
        -99.835176
      ],
      [
        32.415743,
        -99.835191
      ],
      [
        32.415796,
        -99.835199
      ],
      [
        32.4160703,
        -99.8352631
      ],
      [
        32.4178425,
        -99.8356772
      ],
      [
        32.4192775,
        -99.835994
      ],
      [
        32.4193817,
        -99.8360182
      ],
      [
        32.4199159,
        -99.8361423
      ]
    ]
  },
  {
    "id": "demo-road-145",
    "name": "Hope Street",
    "roadType": "local",
    "condition": "good",
    "quality": 90,
    "coords": [
      [
        32.4653302,
        -99.7460154
      ],
      [
        32.467062,
        -99.7458362
      ]
    ]
  },
  {
    "id": "demo-road-146",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 89,
    "coords": [
      [
        32.4082883,
        -99.7716151
      ],
      [
        32.407566,
        -99.7716243
      ]
    ]
  },
  {
    "id": "demo-road-147",
    "name": "service road",
    "roadType": "other",
    "condition": "okay",
    "quality": 67,
    "coords": [
      [
        32.45276,
        -99.7765696
      ],
      [
        32.452571,
        -99.7765839
      ],
      [
        32.4525335,
        -99.7759534
      ],
      [
        32.4524954,
        -99.7754076
      ],
      [
        32.4524888,
        -99.7753141
      ],
      [
        32.4526701,
        -99.775301
      ]
    ]
  },
  {
    "id": "demo-road-148",
    "name": "Ash Street",
    "roadType": "local",
    "condition": "good",
    "quality": 87,
    "coords": [
      [
        32.4579579,
        -99.727262
      ],
      [
        32.458654,
        -99.7271866
      ]
    ]
  },
  {
    "id": "demo-road-149",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 86,
    "coords": [
      [
        32.4510479,
        -99.6978025
      ],
      [
        32.451049,
        -99.6976025
      ]
    ]
  },
  {
    "id": "demo-road-150",
    "name": "service road",
    "roadType": "other",
    "condition": "okay",
    "quality": 61,
    "coords": [
      [
        32.461251,
        -99.817759
      ],
      [
        32.4613171,
        -99.8177189
      ],
      [
        32.4619903,
        -99.8179024
      ],
      [
        32.4619532,
        -99.8181139
      ],
      [
        32.4619169,
        -99.8182928
      ],
      [
        32.4619281,
        -99.8183273
      ],
      [
        32.462522,
        -99.8185
      ],
      [
        32.4625653,
        -99.8182811
      ],
      [
        32.4626126,
        -99.8180639
      ],
      [
        32.4619903,
        -99.8179024
      ]
    ]
  },
  {
    "id": "demo-road-151",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 86,
    "coords": [
      [
        32.4388781,
        -99.7058047
      ],
      [
        32.4388863,
        -99.7060495
      ]
    ]
  },
  {
    "id": "demo-road-152",
    "name": "South 12th Street",
    "roadType": "local",
    "condition": "good",
    "quality": 96,
    "coords": [
      [
        32.4357276,
        -99.7280345
      ],
      [
        32.4357263,
        -99.7286487
      ],
      [
        32.4357347,
        -99.72927
      ],
      [
        32.4357246,
        -99.7298766
      ]
    ]
  },
  {
    "id": "demo-road-153",
    "name": "Creek Bend Court",
    "roadType": "local",
    "condition": "bad",
    "quality": 12,
    "coords": [
      [
        32.4293662,
        -99.6979227
      ],
      [
        32.4293838,
        -99.6973932
      ],
      [
        32.4294028,
        -99.6968451
      ],
      [
        32.4298197,
        -99.6968614
      ],
      [
        32.4300016,
        -99.6968762
      ]
    ]
  },
  {
    "id": "demo-road-154",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 93,
    "coords": [
      [
        32.4678849,
        -99.6960057
      ],
      [
        32.4679384,
        -99.695794
      ]
    ]
  },
  {
    "id": "demo-road-155",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 97,
    "coords": [
      [
        32.3986236,
        -99.7717034
      ],
      [
        32.3986251,
        -99.770866
      ],
      [
        32.3986254,
        -99.7706254
      ]
    ]
  },
  {
    "id": "demo-road-156",
    "name": "North 15th Street",
    "roadType": "local",
    "condition": "good",
    "quality": 99,
    "coords": [
      [
        32.4670748,
        -99.7497608
      ],
      [
        32.4670779,
        -99.7498894
      ],
      [
        32.4670645,
        -99.7499698
      ]
    ]
  },
  {
    "id": "demo-road-157",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 91,
    "coords": [
      [
        32.4888395,
        -99.7319585
      ],
      [
        32.4888518,
        -99.7316199
      ]
    ]
  },
  {
    "id": "demo-road-158",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 88,
    "coords": [
      [
        32.4354476,
        -99.7747049
      ],
      [
        32.4357248,
        -99.7746477
      ],
      [
        32.4358244,
        -99.7746209
      ],
      [
        32.435924,
        -99.7745423
      ]
    ]
  },
  {
    "id": "demo-road-159",
    "name": "South Mockingbird Lane",
    "roadType": "local",
    "condition": "good",
    "quality": 96,
    "coords": [
      [
        32.4491492,
        -99.7582052
      ],
      [
        32.448935,
        -99.7582074
      ],
      [
        32.4484459,
        -99.7582124
      ],
      [
        32.4482145,
        -99.7582032
      ],
      [
        32.4476381,
        -99.7581215
      ],
      [
        32.447466,
        -99.7580618
      ]
    ]
  },
  {
    "id": "demo-road-160",
    "name": "service road",
    "roadType": "other",
    "condition": "okay",
    "quality": 63,
    "coords": [
      [
        32.4402924,
        -99.7694683
      ],
      [
        32.4402942,
        -99.7694421
      ],
      [
        32.4402864,
        -99.769423
      ],
      [
        32.440269,
        -99.7694234
      ],
      [
        32.4402577,
        -99.7694237
      ],
      [
        32.4402255,
        -99.7694385
      ],
      [
        32.440189,
        -99.7694428
      ],
      [
        32.4401323,
        -99.7694407
      ],
      [
        32.4401185,
        -99.7694308
      ],
      [
        32.440115,
        -99.7694024
      ],
      [
        32.4401132,
        -99.7692733
      ]
    ]
  },
  {
    "id": "demo-road-161",
    "name": "service road",
    "roadType": "other",
    "condition": "bad",
    "quality": 25,
    "coords": [
      [
        32.4787601,
        -99.6955505
      ],
      [
        32.4786646,
        -99.6955499
      ]
    ]
  },
  {
    "id": "demo-road-162",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 93,
    "coords": [
      [
        32.4419084,
        -99.6896982
      ],
      [
        32.4418858,
        -99.6907368
      ],
      [
        32.4419399,
        -99.6907869
      ],
      [
        32.4428473,
        -99.6907906
      ],
      [
        32.442894,
        -99.6907315
      ],
      [
        32.4428849,
        -99.6896815
      ]
    ]
  },
  {
    "id": "demo-road-163",
    "name": "East Stamford Street",
    "roadType": "local",
    "condition": "okay",
    "quality": 65,
    "coords": [
      [
        32.479433,
        -99.7036991
      ],
      [
        32.479101,
        -99.7031822
      ]
    ]
  },
  {
    "id": "demo-road-164",
    "name": "Park Avenue",
    "roadType": "local",
    "condition": "good",
    "quality": 89,
    "coords": [
      [
        32.4530035,
        -99.7501767
      ],
      [
        32.454237,
        -99.7501585
      ],
      [
        32.4552677,
        -99.750162
      ]
    ]
  },
  {
    "id": "demo-road-165",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 99,
    "coords": [
      [
        32.4373139,
        -99.747366
      ],
      [
        32.4357592,
        -99.7473582
      ]
    ]
  },
  {
    "id": "demo-road-166",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 99,
    "coords": [
      [
        32.4362593,
        -99.7043264
      ],
      [
        32.4362766,
        -99.7037885
      ]
    ]
  },
  {
    "id": "demo-road-167",
    "name": "Elmdale Road",
    "roadType": "local",
    "condition": "okay",
    "quality": 72,
    "coords": [
      [
        32.438357,
        -99.639581
      ],
      [
        32.4385298,
        -99.6395261
      ],
      [
        32.4393435,
        -99.6392679
      ]
    ]
  },
  {
    "id": "demo-road-168",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 95,
    "coords": [
      [
        32.4581795,
        -99.7412371
      ],
      [
        32.4582508,
        -99.7411892
      ]
    ]
  },
  {
    "id": "demo-road-169",
    "name": "Brookhollow Drive",
    "roadType": "local",
    "condition": "good",
    "quality": 93,
    "coords": [
      [
        32.4179342,
        -99.7698693
      ],
      [
        32.4179125,
        -99.7697228
      ],
      [
        32.4178583,
        -99.7696251
      ],
      [
        32.4177307,
        -99.7694813
      ]
    ]
  },
  {
    "id": "demo-road-170",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 92,
    "coords": [
      [
        32.4485678,
        -99.7972047
      ],
      [
        32.4482171,
        -99.797211
      ]
    ]
  },
  {
    "id": "demo-road-171",
    "name": "South 11th Street",
    "roadType": "local",
    "condition": "good",
    "quality": 86,
    "coords": [
      [
        32.4375028,
        -99.7658861
      ],
      [
        32.437503,
        -99.766342
      ],
      [
        32.4375047,
        -99.7664295
      ],
      [
        32.4375123,
        -99.7668302
      ],
      [
        32.4375136,
        -99.7668961
      ],
      [
        32.4375145,
        -99.7669445
      ],
      [
        32.4375201,
        -99.7672344
      ],
      [
        32.4375246,
        -99.7674734
      ],
      [
        32.4375256,
        -99.7675234
      ],
      [
        32.4375252,
        -99.7676385
      ],
      [
        32.4375244,
        -99.7679068
      ],
      [
        32.4375243,
        -99.7679515
      ],
      [
        32.437524,
        -99.7680385
      ],
      [
        32.4375237,
        -99.7681353
      ],
      [
        32.4375237,
        -99.7681442
      ],
      [
        32.437523,
        -99.7683369
      ],
      [
        32.4375218,
        -99.7687216
      ]
    ]
  },
  {
    "id": "demo-road-172",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 100,
    "coords": [
      [
        32.5147195,
        -99.8010581
      ],
      [
        32.514955,
        -99.8011507
      ],
      [
        32.5151519,
        -99.801229
      ],
      [
        32.5154335,
        -99.80134
      ],
      [
        32.5156463,
        -99.8014292
      ],
      [
        32.5158163,
        -99.8015011
      ],
      [
        32.5160286,
        -99.8015819
      ],
      [
        32.5162247,
        -99.8016487
      ],
      [
        32.5164265,
        -99.8017088
      ]
    ]
  },
  {
    "id": "demo-road-173",
    "name": "service road",
    "roadType": "other",
    "condition": "okay",
    "quality": 66,
    "coords": [
      [
        32.449638,
        -99.7256389
      ],
      [
        32.4490212,
        -99.7257201
      ]
    ]
  },
  {
    "id": "demo-road-174",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 93,
    "coords": [
      [
        32.4365375,
        -99.852147
      ],
      [
        32.4364405,
        -99.8521078
      ],
      [
        32.4363604,
        -99.852032
      ],
      [
        32.4363178,
        -99.8519562
      ],
      [
        32.4363066,
        -99.8519286
      ],
      [
        32.4362855,
        -99.8518097
      ],
      [
        32.4362996,
        -99.8516894
      ],
      [
        32.4363424,
        -99.8515895
      ],
      [
        32.4364093,
        -99.8515105
      ],
      [
        32.4364938,
        -99.8514602
      ],
      [
        32.4365872,
        -99.8514437
      ],
      [
        32.4366804,
        -99.8514627
      ],
      [
        32.4367639,
        -99.8515151
      ]
    ]
  },
  {
    "id": "demo-road-175",
    "name": "Shallow Water Trail",
    "roadType": "local",
    "condition": "okay",
    "quality": 73,
    "coords": [
      [
        32.3915584,
        -99.7112703
      ],
      [
        32.3915716,
        -99.7114747
      ],
      [
        32.391613,
        -99.711618
      ],
      [
        32.391661,
        -99.71175
      ]
    ]
  },
  {
    "id": "demo-road-176",
    "name": "service road",
    "roadType": "other",
    "condition": "okay",
    "quality": 74,
    "coords": [
      [
        32.4660675,
        -99.7755807
      ],
      [
        32.4654279,
        -99.7757841
      ]
    ]
  },
  {
    "id": "demo-road-177",
    "name": "tertiary_link road",
    "roadType": "other",
    "condition": "good",
    "quality": 87,
    "coords": [
      [
        32.4801562,
        -99.689682
      ],
      [
        32.480227,
        -99.6895338
      ]
    ]
  },
  {
    "id": "demo-road-178",
    "name": "North Mockingbird Lane",
    "roadType": "local",
    "condition": "good",
    "quality": 93,
    "coords": [
      [
        32.457892,
        -99.7578359
      ],
      [
        32.4581164,
        -99.7578358
      ],
      [
        32.4582604,
        -99.7578358
      ],
      [
        32.4586462,
        -99.7578356
      ],
      [
        32.4589755,
        -99.7578355
      ],
      [
        32.4604416,
        -99.7578282
      ],
      [
        32.4607487,
        -99.7578268
      ],
      [
        32.4609157,
        -99.7578259
      ]
    ]
  },
  {
    "id": "demo-road-179",
    "name": "Spring Creek Road",
    "roadType": "local",
    "condition": "good",
    "quality": 94,
    "coords": [
      [
        32.392327,
        -99.713122
      ],
      [
        32.390796,
        -99.713094
      ],
      [
        32.3892349,
        -99.7131369
      ],
      [
        32.3876515,
        -99.7131278
      ]
    ]
  },
  {
    "id": "demo-road-180",
    "name": "River Oaks Circle",
    "roadType": "local",
    "condition": "good",
    "quality": 91,
    "coords": [
      [
        32.426492,
        -99.78168
      ],
      [
        32.4264944,
        -99.7819281
      ],
      [
        32.4264537,
        -99.7821533
      ],
      [
        32.4263913,
        -99.7823921
      ],
      [
        32.4262963,
        -99.7826553
      ],
      [
        32.4262041,
        -99.7828045
      ],
      [
        32.4260982,
        -99.7828995
      ],
      [
        32.4259843,
        -99.7829483
      ],
      [
        32.4258785,
        -99.7829727
      ],
      [
        32.4257482,
        -99.7829591
      ],
      [
        32.425637,
        -99.7829076
      ],
      [
        32.4255474,
        -99.7828126
      ],
      [
        32.4255067,
        -99.7827014
      ],
      [
        32.4254887,
        -99.7825504
      ],
      [
        32.425485,
        -99.7825196
      ],
      [
        32.4254769,
        -99.7807695
      ]
    ]
  },
  {
    "id": "demo-road-181",
    "name": "service road",
    "roadType": "other",
    "condition": "okay",
    "quality": 70,
    "coords": [
      [
        32.4739279,
        -99.7265664
      ],
      [
        32.4738844,
        -99.7265449
      ]
    ]
  },
  {
    "id": "demo-road-182",
    "name": "Lytle Acres Drive",
    "roadType": "local",
    "condition": "okay",
    "quality": 83,
    "coords": [
      [
        32.4337453,
        -99.7146083
      ],
      [
        32.4333347,
        -99.7145661
      ],
      [
        32.4327879,
        -99.7144913
      ],
      [
        32.4325788,
        -99.714497
      ],
      [
        32.432124,
        -99.714494
      ],
      [
        32.430512,
        -99.714511
      ]
    ]
  },
  {
    "id": "demo-road-183",
    "name": "service road",
    "roadType": "other",
    "condition": "okay",
    "quality": 70,
    "coords": [
      [
        32.4040313,
        -99.7672045
      ],
      [
        32.4040222,
        -99.7665379
      ]
    ]
  },
  {
    "id": "demo-road-184",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 85,
    "coords": [
      [
        32.3938868,
        -99.7430634
      ],
      [
        32.3938801,
        -99.7429968
      ],
      [
        32.3938421,
        -99.7429432
      ],
      [
        32.3937798,
        -99.7428856
      ],
      [
        32.3935584,
        -99.7427265
      ],
      [
        32.3934974,
        -99.7427131
      ]
    ]
  },
  {
    "id": "demo-road-185",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 96,
    "coords": [
      [
        32.4777522,
        -99.7320933
      ],
      [
        32.4777543,
        -99.7314903
      ]
    ]
  },
  {
    "id": "demo-road-186",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 91,
    "coords": [
      [
        32.441538,
        -99.7776252
      ],
      [
        32.4415244,
        -99.7754899
      ],
      [
        32.4415334,
        -99.7752807
      ]
    ]
  },
  {
    "id": "demo-road-187",
    "name": "East Industrial Boulevard",
    "roadType": "local",
    "condition": "okay",
    "quality": 69,
    "coords": [
      [
        32.4015518,
        -99.7131597
      ],
      [
        32.401548,
        -99.7128008
      ],
      [
        32.4015415,
        -99.7121782
      ]
    ]
  },
  {
    "id": "demo-road-188",
    "name": "College Drive",
    "roadType": "local",
    "condition": "good",
    "quality": 98,
    "coords": [
      [
        32.4672493,
        -99.7155131
      ],
      [
        32.4672469,
        -99.7144725
      ],
      [
        32.4672488,
        -99.7121822
      ],
      [
        32.4672489,
        -99.7120134
      ],
      [
        32.4672493,
        -99.7115605
      ]
    ]
  },
  {
    "id": "demo-road-189",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 86,
    "coords": [
      [
        32.4216951,
        -99.8425693
      ],
      [
        32.4217727,
        -99.8420915
      ],
      [
        32.4219291,
        -99.8421261
      ],
      [
        32.4221119,
        -99.8421665
      ],
      [
        32.4223279,
        -99.8422143
      ]
    ]
  },
  {
    "id": "demo-road-190",
    "name": "service road",
    "roadType": "other",
    "condition": "okay",
    "quality": 84,
    "coords": [
      [
        32.5559714,
        -99.8391845
      ],
      [
        32.5562938,
        -99.8394206
      ]
    ]
  },
  {
    "id": "demo-road-191",
    "name": "secondary_link road",
    "roadType": "other",
    "condition": "bad",
    "quality": 17,
    "coords": [
      [
        32.4364518,
        -99.7132129
      ],
      [
        32.4363975,
        -99.7129869
      ],
      [
        32.4363392,
        -99.7127928
      ],
      [
        32.4362769,
        -99.7126929
      ],
      [
        32.4361982,
        -99.7126079
      ],
      [
        32.435989,
        -99.7124581
      ]
    ]
  },
  {
    "id": "demo-road-192",
    "name": "Steffens Street",
    "roadType": "local",
    "condition": "okay",
    "quality": 82,
    "coords": [
      [
        32.451945,
        -99.78779
      ],
      [
        32.4520252,
        -99.7878176
      ],
      [
        32.4521133,
        -99.7878994
      ],
      [
        32.4521721,
        -99.7880101
      ],
      [
        32.4522016,
        -99.788148
      ],
      [
        32.4522737,
        -99.7890018
      ]
    ]
  },
  {
    "id": "demo-road-193",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 99,
    "coords": [
      [
        32.4834278,
        -99.7152923
      ],
      [
        32.4834138,
        -99.7138293
      ]
    ]
  },
  {
    "id": "demo-road-194",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 99,
    "coords": [
      [
        32.518415,
        -99.654789
      ],
      [
        32.5177535,
        -99.6547614
      ]
    ]
  },
  {
    "id": "demo-road-195",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 93,
    "coords": [
      [
        32.4278517,
        -99.7665367
      ],
      [
        32.4274368,
        -99.7665394
      ],
      [
        32.4270193,
        -99.7665421
      ]
    ]
  },
  {
    "id": "demo-road-196",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 88,
    "coords": [
      [
        32.3977061,
        -99.758494
      ],
      [
        32.3978756,
        -99.7584321
      ]
    ]
  },
  {
    "id": "demo-road-197",
    "name": "service road",
    "roadType": "other",
    "condition": "good",
    "quality": 87,
    "coords": [
      [
        32.4786661,
        -99.6958077
      ],
      [
        32.4787524,
        -99.6958073
      ]
    ]
  },
  {
    "id": "demo-road-198",
    "name": "Llano Street",
    "roadType": "local",
    "condition": "good",
    "quality": 99,
    "coords": [
      [
        32.427241,
        -99.790903
      ],
      [
        32.4272546,
        -99.7910322
      ],
      [
        32.4272619,
        -99.7932314
      ]
    ]
  },
  {
    "id": "demo-road-199",
    "name": "Woods Place",
    "roadType": "local",
    "condition": "good",
    "quality": 98,
    "coords": [
      [
        32.4007415,
        -99.7400447
      ],
      [
        32.401334,
        -99.7400457
      ]
    ]
  },
  {
    "id": "demo-road-200",
    "name": "Lance Drive",
    "roadType": "local",
    "condition": "good",
    "quality": 96,
    "coords": [
      [
        32.4147105,
        -99.6801786
      ],
      [
        32.414711,
        -99.6802737
      ]
    ]
  }
];

const DEMO_ROAD_COUNTS = {
  "total": 200,
  "good": 140,
  "okay": 40,
  "bad": 20
};

export { DEMO_ROAD_SEGMENTS, DEMO_ROAD_COUNTS };
export type { RoadCondition, RoadSegment };
