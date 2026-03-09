window.HOTEL_STRUCTURE={
  "model": {
    "hotelId": "novotel_collegien",
    "floors": [
      1,
      2,
      3,
      4
    ]
  },
  "topology": {
    "floors": {
      "1": {
        "tri_near_core": {
          "north": [
            129,
            131,
            133
          ],
          "south": [
            130,
            132,
            134
          ]
        },
        "tri_vertical": {
          "west": [
            136,
            138,
            140,
            142,
            144,
            146,
            148,
            150
          ],
          "east": [
            135,
            137,
            139,
            141,
            143,
            145,
            147,
            149
          ]
        },
        "privm_wing": {
          "north": [
            161,
            163,
            165,
            167,
            169,
            171,
            173,
            175,
            177,
            179,
            181,
            183,
            185
          ],
          "south": [
            160,
            162,
            164,
            166,
            168,
            170,
            172,
            174,
            176,
            178,
            180,
            182,
            184,
            186
          ]
        }
      },
      "2": {
        "tri_wing_main": {
          "north": [
            221,
            223,
            225,
            227,
            229,
            231,
            233,
            235,
            237,
            239,
            241
          ],
          "south": [
            220,
            222,
            224,
            226,
            228,
            230,
            232,
            234,
            236,
            238,
            240,
            242
          ]
        },
        "tri_vertical": {
          "west": [
            244,
            246,
            248,
            250,
            252,
            254,
            256,
            258
          ],
          "east": [
            243,
            245,
            247,
            249,
            251,
            253,
            255,
            257
          ]
        },
        "stdm_wing": {
          "north": [
            261,
            263,
            265,
            267,
            269,
            271,
            273,
            275,
            277,
            279,
            281,
            283
          ],
          "south": [
            260,
            262,
            264,
            266,
            268,
            270,
            272,
            274,
            276,
            278,
            280,
            282
          ]
        }
      },
      "3": {
        "sge_near_core": {
          "north": [
            321,
            323
          ],
          "south": [
            320,
            322,
            324
          ]
        },
        "sge_wing": {
          "north": [
            325,
            327,
            329,
            331,
            333,
            335,
            337
          ],
          "south": [
            326,
            328,
            330,
            332,
            334,
            336,
            338,
            340,
            342
          ]
        },
        "exec_wing": {
          "north": [
            361,
            363,
            365,
            367,
            369,
            371,
            373,
            375,
            377,
            379,
            381,
            383,
            385
          ],
          "south": [
            360,
            362,
            364,
            366,
            368,
            370,
            372,
            374,
            376,
            378,
            380,
            382,
            384,
            386
          ]
        }
      },
      "4": {
        "stdm_top_wing": {
          "north": [
            461,
            463,
            465,
            467,
            469,
            471,
            473,
            475,
            477,
            479,
            481,
            483,
            485,
            487
          ],
          "south": [
            460,
            462,
            464,
            466,
            468,
            470,
            472,
            474,
            476,
            478,
            480,
            482,
            484,
            486
          ]
        }
      }
    }
  },
  "rooms": [
    {
      "id": 129,
      "floor": 1,
      "cluster": "tri_near_core",
      "side": "north",
      "left": null,
      "right": 131
    },
    {
      "id": 131,
      "floor": 1,
      "cluster": "tri_near_core",
      "side": "north",
      "left": 129,
      "right": 133
    },
    {
      "id": 133,
      "floor": 1,
      "cluster": "tri_near_core",
      "side": "north",
      "left": 131,
      "right": null
    },
    {
      "id": 130,
      "floor": 1,
      "cluster": "tri_near_core",
      "side": "south",
      "left": null,
      "right": 132
    },
    {
      "id": 132,
      "floor": 1,
      "cluster": "tri_near_core",
      "side": "south",
      "left": 130,
      "right": 134
    },
    {
      "id": 134,
      "floor": 1,
      "cluster": "tri_near_core",
      "side": "south",
      "left": 132,
      "right": null
    },
    {
      "id": 136,
      "floor": 1,
      "cluster": "tri_vertical",
      "side": "west",
      "left": null,
      "right": 138
    },
    {
      "id": 138,
      "floor": 1,
      "cluster": "tri_vertical",
      "side": "west",
      "left": 136,
      "right": 140
    },
    {
      "id": 140,
      "floor": 1,
      "cluster": "tri_vertical",
      "side": "west",
      "left": 138,
      "right": 142
    },
    {
      "id": 142,
      "floor": 1,
      "cluster": "tri_vertical",
      "side": "west",
      "left": 140,
      "right": 144
    },
    {
      "id": 144,
      "floor": 1,
      "cluster": "tri_vertical",
      "side": "west",
      "left": 142,
      "right": 146
    },
    {
      "id": 146,
      "floor": 1,
      "cluster": "tri_vertical",
      "side": "west",
      "left": 144,
      "right": 148
    },
    {
      "id": 148,
      "floor": 1,
      "cluster": "tri_vertical",
      "side": "west",
      "left": 146,
      "right": 150
    },
    {
      "id": 150,
      "floor": 1,
      "cluster": "tri_vertical",
      "side": "west",
      "left": 148,
      "right": null
    },
    {
      "id": 135,
      "floor": 1,
      "cluster": "tri_vertical",
      "side": "east",
      "left": null,
      "right": 137
    },
    {
      "id": 137,
      "floor": 1,
      "cluster": "tri_vertical",
      "side": "east",
      "left": 135,
      "right": 139
    },
    {
      "id": 139,
      "floor": 1,
      "cluster": "tri_vertical",
      "side": "east",
      "left": 137,
      "right": 141
    },
    {
      "id": 141,
      "floor": 1,
      "cluster": "tri_vertical",
      "side": "east",
      "left": 139,
      "right": 143
    },
    {
      "id": 143,
      "floor": 1,
      "cluster": "tri_vertical",
      "side": "east",
      "left": 141,
      "right": 145
    },
    {
      "id": 145,
      "floor": 1,
      "cluster": "tri_vertical",
      "side": "east",
      "left": 143,
      "right": 147
    },
    {
      "id": 147,
      "floor": 1,
      "cluster": "tri_vertical",
      "side": "east",
      "left": 145,
      "right": 149
    },
    {
      "id": 149,
      "floor": 1,
      "cluster": "tri_vertical",
      "side": "east",
      "left": 147,
      "right": null
    },
    {
      "id": 161,
      "floor": 1,
      "cluster": "privm_wing",
      "side": "north",
      "left": null,
      "right": 163
    },
    {
      "id": 163,
      "floor": 1,
      "cluster": "privm_wing",
      "side": "north",
      "left": 161,
      "right": 165
    },
    {
      "id": 165,
      "floor": 1,
      "cluster": "privm_wing",
      "side": "north",
      "left": 163,
      "right": 167
    },
    {
      "id": 167,
      "floor": 1,
      "cluster": "privm_wing",
      "side": "north",
      "left": 165,
      "right": 169
    },
    {
      "id": 169,
      "floor": 1,
      "cluster": "privm_wing",
      "side": "north",
      "left": 167,
      "right": 171
    },
    {
      "id": 171,
      "floor": 1,
      "cluster": "privm_wing",
      "side": "north",
      "left": 169,
      "right": 173
    },
    {
      "id": 173,
      "floor": 1,
      "cluster": "privm_wing",
      "side": "north",
      "left": 171,
      "right": 175
    },
    {
      "id": 175,
      "floor": 1,
      "cluster": "privm_wing",
      "side": "north",
      "left": 173,
      "right": 177
    },
    {
      "id": 177,
      "floor": 1,
      "cluster": "privm_wing",
      "side": "north",
      "left": 175,
      "right": 179
    },
    {
      "id": 179,
      "floor": 1,
      "cluster": "privm_wing",
      "side": "north",
      "left": 177,
      "right": 181
    },
    {
      "id": 181,
      "floor": 1,
      "cluster": "privm_wing",
      "side": "north",
      "left": 179,
      "right": 183
    },
    {
      "id": 183,
      "floor": 1,
      "cluster": "privm_wing",
      "side": "north",
      "left": 181,
      "right": 185
    },
    {
      "id": 185,
      "floor": 1,
      "cluster": "privm_wing",
      "side": "north",
      "left": 183,
      "right": null
    },
    {
      "id": 160,
      "floor": 1,
      "cluster": "privm_wing",
      "side": "south",
      "left": null,
      "right": 162
    },
    {
      "id": 162,
      "floor": 1,
      "cluster": "privm_wing",
      "side": "south",
      "left": 160,
      "right": 164
    },
    {
      "id": 164,
      "floor": 1,
      "cluster": "privm_wing",
      "side": "south",
      "left": 162,
      "right": 166
    },
    {
      "id": 166,
      "floor": 1,
      "cluster": "privm_wing",
      "side": "south",
      "left": 164,
      "right": 168
    },
    {
      "id": 168,
      "floor": 1,
      "cluster": "privm_wing",
      "side": "south",
      "left": 166,
      "right": 170
    },
    {
      "id": 170,
      "floor": 1,
      "cluster": "privm_wing",
      "side": "south",
      "left": 168,
      "right": 172
    },
    {
      "id": 172,
      "floor": 1,
      "cluster": "privm_wing",
      "side": "south",
      "left": 170,
      "right": 174
    },
    {
      "id": 174,
      "floor": 1,
      "cluster": "privm_wing",
      "side": "south",
      "left": 172,
      "right": 176
    },
    {
      "id": 176,
      "floor": 1,
      "cluster": "privm_wing",
      "side": "south",
      "left": 174,
      "right": 178
    },
    {
      "id": 178,
      "floor": 1,
      "cluster": "privm_wing",
      "side": "south",
      "left": 176,
      "right": 180
    },
    {
      "id": 180,
      "floor": 1,
      "cluster": "privm_wing",
      "side": "south",
      "left": 178,
      "right": 182
    },
    {
      "id": 182,
      "floor": 1,
      "cluster": "privm_wing",
      "side": "south",
      "left": 180,
      "right": 184
    },
    {
      "id": 184,
      "floor": 1,
      "cluster": "privm_wing",
      "side": "south",
      "left": 182,
      "right": 186
    },
    {
      "id": 186,
      "floor": 1,
      "cluster": "privm_wing",
      "side": "south",
      "left": 184,
      "right": null
    },
    {
      "id": 221,
      "floor": 2,
      "cluster": "tri_wing_main",
      "side": "north",
      "left": null,
      "right": 223
    },
    {
      "id": 223,
      "floor": 2,
      "cluster": "tri_wing_main",
      "side": "north",
      "left": 221,
      "right": 225
    },
    {
      "id": 225,
      "floor": 2,
      "cluster": "tri_wing_main",
      "side": "north",
      "left": 223,
      "right": 227
    },
    {
      "id": 227,
      "floor": 2,
      "cluster": "tri_wing_main",
      "side": "north",
      "left": 225,
      "right": 229
    },
    {
      "id": 229,
      "floor": 2,
      "cluster": "tri_wing_main",
      "side": "north",
      "left": 227,
      "right": 231
    },
    {
      "id": 231,
      "floor": 2,
      "cluster": "tri_wing_main",
      "side": "north",
      "left": 229,
      "right": 233
    },
    {
      "id": 233,
      "floor": 2,
      "cluster": "tri_wing_main",
      "side": "north",
      "left": 231,
      "right": 235
    },
    {
      "id": 235,
      "floor": 2,
      "cluster": "tri_wing_main",
      "side": "north",
      "left": 233,
      "right": 237
    },
    {
      "id": 237,
      "floor": 2,
      "cluster": "tri_wing_main",
      "side": "north",
      "left": 235,
      "right": 239
    },
    {
      "id": 239,
      "floor": 2,
      "cluster": "tri_wing_main",
      "side": "north",
      "left": 237,
      "right": 241
    },
    {
      "id": 241,
      "floor": 2,
      "cluster": "tri_wing_main",
      "side": "north",
      "left": 239,
      "right": null
    },
    {
      "id": 220,
      "floor": 2,
      "cluster": "tri_wing_main",
      "side": "south",
      "left": null,
      "right": 222
    },
    {
      "id": 222,
      "floor": 2,
      "cluster": "tri_wing_main",
      "side": "south",
      "left": 220,
      "right": 224
    },
    {
      "id": 224,
      "floor": 2,
      "cluster": "tri_wing_main",
      "side": "south",
      "left": 222,
      "right": 226
    },
    {
      "id": 226,
      "floor": 2,
      "cluster": "tri_wing_main",
      "side": "south",
      "left": 224,
      "right": 228
    },
    {
      "id": 228,
      "floor": 2,
      "cluster": "tri_wing_main",
      "side": "south",
      "left": 226,
      "right": 230
    },
    {
      "id": 230,
      "floor": 2,
      "cluster": "tri_wing_main",
      "side": "south",
      "left": 228,
      "right": 232
    },
    {
      "id": 232,
      "floor": 2,
      "cluster": "tri_wing_main",
      "side": "south",
      "left": 230,
      "right": 234
    },
    {
      "id": 234,
      "floor": 2,
      "cluster": "tri_wing_main",
      "side": "south",
      "left": 232,
      "right": 236
    },
    {
      "id": 236,
      "floor": 2,
      "cluster": "tri_wing_main",
      "side": "south",
      "left": 234,
      "right": 238
    },
    {
      "id": 238,
      "floor": 2,
      "cluster": "tri_wing_main",
      "side": "south",
      "left": 236,
      "right": 240
    },
    {
      "id": 240,
      "floor": 2,
      "cluster": "tri_wing_main",
      "side": "south",
      "left": 238,
      "right": 242
    },
    {
      "id": 242,
      "floor": 2,
      "cluster": "tri_wing_main",
      "side": "south",
      "left": 240,
      "right": null
    },
    {
      "id": 244,
      "floor": 2,
      "cluster": "tri_vertical",
      "side": "west",
      "left": null,
      "right": 246
    },
    {
      "id": 246,
      "floor": 2,
      "cluster": "tri_vertical",
      "side": "west",
      "left": 244,
      "right": 248
    },
    {
      "id": 248,
      "floor": 2,
      "cluster": "tri_vertical",
      "side": "west",
      "left": 246,
      "right": 250
    },
    {
      "id": 250,
      "floor": 2,
      "cluster": "tri_vertical",
      "side": "west",
      "left": 248,
      "right": 252
    },
    {
      "id": 252,
      "floor": 2,
      "cluster": "tri_vertical",
      "side": "west",
      "left": 250,
      "right": 254
    },
    {
      "id": 254,
      "floor": 2,
      "cluster": "tri_vertical",
      "side": "west",
      "left": 252,
      "right": 256
    },
    {
      "id": 256,
      "floor": 2,
      "cluster": "tri_vertical",
      "side": "west",
      "left": 254,
      "right": 258
    },
    {
      "id": 258,
      "floor": 2,
      "cluster": "tri_vertical",
      "side": "west",
      "left": 256,
      "right": null
    },
    {
      "id": 243,
      "floor": 2,
      "cluster": "tri_vertical",
      "side": "east",
      "left": null,
      "right": 245
    },
    {
      "id": 245,
      "floor": 2,
      "cluster": "tri_vertical",
      "side": "east",
      "left": 243,
      "right": 247
    },
    {
      "id": 247,
      "floor": 2,
      "cluster": "tri_vertical",
      "side": "east",
      "left": 245,
      "right": 249
    },
    {
      "id": 249,
      "floor": 2,
      "cluster": "tri_vertical",
      "side": "east",
      "left": 247,
      "right": 251
    },
    {
      "id": 251,
      "floor": 2,
      "cluster": "tri_vertical",
      "side": "east",
      "left": 249,
      "right": 253
    },
    {
      "id": 253,
      "floor": 2,
      "cluster": "tri_vertical",
      "side": "east",
      "left": 251,
      "right": 255
    },
    {
      "id": 255,
      "floor": 2,
      "cluster": "tri_vertical",
      "side": "east",
      "left": 253,
      "right": 257
    },
    {
      "id": 257,
      "floor": 2,
      "cluster": "tri_vertical",
      "side": "east",
      "left": 255,
      "right": null
    },
    {
      "id": 261,
      "floor": 2,
      "cluster": "stdm_wing",
      "side": "north",
      "left": null,
      "right": 263
    },
    {
      "id": 263,
      "floor": 2,
      "cluster": "stdm_wing",
      "side": "north",
      "left": 261,
      "right": 265
    },
    {
      "id": 265,
      "floor": 2,
      "cluster": "stdm_wing",
      "side": "north",
      "left": 263,
      "right": 267
    },
    {
      "id": 267,
      "floor": 2,
      "cluster": "stdm_wing",
      "side": "north",
      "left": 265,
      "right": 269
    },
    {
      "id": 269,
      "floor": 2,
      "cluster": "stdm_wing",
      "side": "north",
      "left": 267,
      "right": 271
    },
    {
      "id": 271,
      "floor": 2,
      "cluster": "stdm_wing",
      "side": "north",
      "left": 269,
      "right": 273
    },
    {
      "id": 273,
      "floor": 2,
      "cluster": "stdm_wing",
      "side": "north",
      "left": 271,
      "right": 275
    },
    {
      "id": 275,
      "floor": 2,
      "cluster": "stdm_wing",
      "side": "north",
      "left": 273,
      "right": 277
    },
    {
      "id": 277,
      "floor": 2,
      "cluster": "stdm_wing",
      "side": "north",
      "left": 275,
      "right": 279
    },
    {
      "id": 279,
      "floor": 2,
      "cluster": "stdm_wing",
      "side": "north",
      "left": 277,
      "right": 281
    },
    {
      "id": 281,
      "floor": 2,
      "cluster": "stdm_wing",
      "side": "north",
      "left": 279,
      "right": 283
    },
    {
      "id": 283,
      "floor": 2,
      "cluster": "stdm_wing",
      "side": "north",
      "left": 281,
      "right": null
    },
    {
      "id": 260,
      "floor": 2,
      "cluster": "stdm_wing",
      "side": "south",
      "left": null,
      "right": 262
    },
    {
      "id": 262,
      "floor": 2,
      "cluster": "stdm_wing",
      "side": "south",
      "left": 260,
      "right": 264
    },
    {
      "id": 264,
      "floor": 2,
      "cluster": "stdm_wing",
      "side": "south",
      "left": 262,
      "right": 266
    },
    {
      "id": 266,
      "floor": 2,
      "cluster": "stdm_wing",
      "side": "south",
      "left": 264,
      "right": 268
    },
    {
      "id": 268,
      "floor": 2,
      "cluster": "stdm_wing",
      "side": "south",
      "left": 266,
      "right": 270
    },
    {
      "id": 270,
      "floor": 2,
      "cluster": "stdm_wing",
      "side": "south",
      "left": 268,
      "right": 272
    },
    {
      "id": 272,
      "floor": 2,
      "cluster": "stdm_wing",
      "side": "south",
      "left": 270,
      "right": 274
    },
    {
      "id": 274,
      "floor": 2,
      "cluster": "stdm_wing",
      "side": "south",
      "left": 272,
      "right": 276
    },
    {
      "id": 276,
      "floor": 2,
      "cluster": "stdm_wing",
      "side": "south",
      "left": 274,
      "right": 278
    },
    {
      "id": 278,
      "floor": 2,
      "cluster": "stdm_wing",
      "side": "south",
      "left": 276,
      "right": 280
    },
    {
      "id": 280,
      "floor": 2,
      "cluster": "stdm_wing",
      "side": "south",
      "left": 278,
      "right": 282
    },
    {
      "id": 282,
      "floor": 2,
      "cluster": "stdm_wing",
      "side": "south",
      "left": 280,
      "right": null
    },
    {
      "id": 321,
      "floor": 3,
      "cluster": "sge_near_core",
      "side": "north",
      "left": null,
      "right": 323
    },
    {
      "id": 323,
      "floor": 3,
      "cluster": "sge_near_core",
      "side": "north",
      "left": 321,
      "right": null
    },
    {
      "id": 320,
      "floor": 3,
      "cluster": "sge_near_core",
      "side": "south",
      "left": null,
      "right": 322
    },
    {
      "id": 322,
      "floor": 3,
      "cluster": "sge_near_core",
      "side": "south",
      "left": 320,
      "right": 324
    },
    {
      "id": 324,
      "floor": 3,
      "cluster": "sge_near_core",
      "side": "south",
      "left": 322,
      "right": null
    },
    {
      "id": 325,
      "floor": 3,
      "cluster": "sge_wing",
      "side": "north",
      "left": null,
      "right": 327
    },
    {
      "id": 327,
      "floor": 3,
      "cluster": "sge_wing",
      "side": "north",
      "left": 325,
      "right": 329
    },
    {
      "id": 329,
      "floor": 3,
      "cluster": "sge_wing",
      "side": "north",
      "left": 327,
      "right": 331
    },
    {
      "id": 331,
      "floor": 3,
      "cluster": "sge_wing",
      "side": "north",
      "left": 329,
      "right": 333
    },
    {
      "id": 333,
      "floor": 3,
      "cluster": "sge_wing",
      "side": "north",
      "left": 331,
      "right": 335
    },
    {
      "id": 335,
      "floor": 3,
      "cluster": "sge_wing",
      "side": "north",
      "left": 333,
      "right": 337
    },
    {
      "id": 337,
      "floor": 3,
      "cluster": "sge_wing",
      "side": "north",
      "left": 335,
      "right": null
    },
    {
      "id": 326,
      "floor": 3,
      "cluster": "sge_wing",
      "side": "south",
      "left": null,
      "right": 328
    },
    {
      "id": 328,
      "floor": 3,
      "cluster": "sge_wing",
      "side": "south",
      "left": 326,
      "right": 330
    },
    {
      "id": 330,
      "floor": 3,
      "cluster": "sge_wing",
      "side": "south",
      "left": 328,
      "right": 332
    },
    {
      "id": 332,
      "floor": 3,
      "cluster": "sge_wing",
      "side": "south",
      "left": 330,
      "right": 334
    },
    {
      "id": 334,
      "floor": 3,
      "cluster": "sge_wing",
      "side": "south",
      "left": 332,
      "right": 336
    },
    {
      "id": 336,
      "floor": 3,
      "cluster": "sge_wing",
      "side": "south",
      "left": 334,
      "right": 338
    },
    {
      "id": 338,
      "floor": 3,
      "cluster": "sge_wing",
      "side": "south",
      "left": 336,
      "right": 340
    },
    {
      "id": 340,
      "floor": 3,
      "cluster": "sge_wing",
      "side": "south",
      "left": 338,
      "right": 342
    },
    {
      "id": 342,
      "floor": 3,
      "cluster": "sge_wing",
      "side": "south",
      "left": 340,
      "right": null
    },
    {
      "id": 361,
      "floor": 3,
      "cluster": "exec_wing",
      "side": "north",
      "left": null,
      "right": 363
    },
    {
      "id": 363,
      "floor": 3,
      "cluster": "exec_wing",
      "side": "north",
      "left": 361,
      "right": 365
    },
    {
      "id": 365,
      "floor": 3,
      "cluster": "exec_wing",
      "side": "north",
      "left": 363,
      "right": 367
    },
    {
      "id": 367,
      "floor": 3,
      "cluster": "exec_wing",
      "side": "north",
      "left": 365,
      "right": 369
    },
    {
      "id": 369,
      "floor": 3,
      "cluster": "exec_wing",
      "side": "north",
      "left": 367,
      "right": 371
    },
    {
      "id": 371,
      "floor": 3,
      "cluster": "exec_wing",
      "side": "north",
      "left": 369,
      "right": 373
    },
    {
      "id": 373,
      "floor": 3,
      "cluster": "exec_wing",
      "side": "north",
      "left": 371,
      "right": 375
    },
    {
      "id": 375,
      "floor": 3,
      "cluster": "exec_wing",
      "side": "north",
      "left": 373,
      "right": 377
    },
    {
      "id": 377,
      "floor": 3,
      "cluster": "exec_wing",
      "side": "north",
      "left": 375,
      "right": 379
    },
    {
      "id": 379,
      "floor": 3,
      "cluster": "exec_wing",
      "side": "north",
      "left": 377,
      "right": 381
    },
    {
      "id": 381,
      "floor": 3,
      "cluster": "exec_wing",
      "side": "north",
      "left": 379,
      "right": 383
    },
    {
      "id": 383,
      "floor": 3,
      "cluster": "exec_wing",
      "side": "north",
      "left": 381,
      "right": 385
    },
    {
      "id": 385,
      "floor": 3,
      "cluster": "exec_wing",
      "side": "north",
      "left": 383,
      "right": null
    },
    {
      "id": 360,
      "floor": 3,
      "cluster": "exec_wing",
      "side": "south",
      "left": null,
      "right": 362
    },
    {
      "id": 362,
      "floor": 3,
      "cluster": "exec_wing",
      "side": "south",
      "left": 360,
      "right": 364
    },
    {
      "id": 364,
      "floor": 3,
      "cluster": "exec_wing",
      "side": "south",
      "left": 362,
      "right": 366
    },
    {
      "id": 366,
      "floor": 3,
      "cluster": "exec_wing",
      "side": "south",
      "left": 364,
      "right": 368
    },
    {
      "id": 368,
      "floor": 3,
      "cluster": "exec_wing",
      "side": "south",
      "left": 366,
      "right": 370
    },
    {
      "id": 370,
      "floor": 3,
      "cluster": "exec_wing",
      "side": "south",
      "left": 368,
      "right": 372
    },
    {
      "id": 372,
      "floor": 3,
      "cluster": "exec_wing",
      "side": "south",
      "left": 370,
      "right": 374
    },
    {
      "id": 374,
      "floor": 3,
      "cluster": "exec_wing",
      "side": "south",
      "left": 372,
      "right": 376
    },
    {
      "id": 376,
      "floor": 3,
      "cluster": "exec_wing",
      "side": "south",
      "left": 374,
      "right": 378
    },
    {
      "id": 378,
      "floor": 3,
      "cluster": "exec_wing",
      "side": "south",
      "left": 376,
      "right": 380
    },
    {
      "id": 380,
      "floor": 3,
      "cluster": "exec_wing",
      "side": "south",
      "left": 378,
      "right": 382
    },
    {
      "id": 382,
      "floor": 3,
      "cluster": "exec_wing",
      "side": "south",
      "left": 380,
      "right": 384
    },
    {
      "id": 384,
      "floor": 3,
      "cluster": "exec_wing",
      "side": "south",
      "left": 382,
      "right": 386
    },
    {
      "id": 386,
      "floor": 3,
      "cluster": "exec_wing",
      "side": "south",
      "left": 384,
      "right": null
    },
    {
      "id": 461,
      "floor": 4,
      "cluster": "stdm_top_wing",
      "side": "north",
      "left": null,
      "right": 463
    },
    {
      "id": 463,
      "floor": 4,
      "cluster": "stdm_top_wing",
      "side": "north",
      "left": 461,
      "right": 465
    },
    {
      "id": 465,
      "floor": 4,
      "cluster": "stdm_top_wing",
      "side": "north",
      "left": 463,
      "right": 467
    },
    {
      "id": 467,
      "floor": 4,
      "cluster": "stdm_top_wing",
      "side": "north",
      "left": 465,
      "right": 469
    },
    {
      "id": 469,
      "floor": 4,
      "cluster": "stdm_top_wing",
      "side": "north",
      "left": 467,
      "right": 471
    },
    {
      "id": 471,
      "floor": 4,
      "cluster": "stdm_top_wing",
      "side": "north",
      "left": 469,
      "right": 473
    },
    {
      "id": 473,
      "floor": 4,
      "cluster": "stdm_top_wing",
      "side": "north",
      "left": 471,
      "right": 475
    },
    {
      "id": 475,
      "floor": 4,
      "cluster": "stdm_top_wing",
      "side": "north",
      "left": 473,
      "right": 477
    },
    {
      "id": 477,
      "floor": 4,
      "cluster": "stdm_top_wing",
      "side": "north",
      "left": 475,
      "right": 479
    },
    {
      "id": 479,
      "floor": 4,
      "cluster": "stdm_top_wing",
      "side": "north",
      "left": 477,
      "right": 481
    },
    {
      "id": 481,
      "floor": 4,
      "cluster": "stdm_top_wing",
      "side": "north",
      "left": 479,
      "right": 483
    },
    {
      "id": 483,
      "floor": 4,
      "cluster": "stdm_top_wing",
      "side": "north",
      "left": 481,
      "right": 485
    },
    {
      "id": 485,
      "floor": 4,
      "cluster": "stdm_top_wing",
      "side": "north",
      "left": 483,
      "right": 487
    },
    {
      "id": 487,
      "floor": 4,
      "cluster": "stdm_top_wing",
      "side": "north",
      "left": 485,
      "right": null
    },
    {
      "id": 460,
      "floor": 4,
      "cluster": "stdm_top_wing",
      "side": "south",
      "left": null,
      "right": 462
    },
    {
      "id": 462,
      "floor": 4,
      "cluster": "stdm_top_wing",
      "side": "south",
      "left": 460,
      "right": 464
    },
    {
      "id": 464,
      "floor": 4,
      "cluster": "stdm_top_wing",
      "side": "south",
      "left": 462,
      "right": 466
    },
    {
      "id": 466,
      "floor": 4,
      "cluster": "stdm_top_wing",
      "side": "south",
      "left": 464,
      "right": 468
    },
    {
      "id": 468,
      "floor": 4,
      "cluster": "stdm_top_wing",
      "side": "south",
      "left": 466,
      "right": 470
    },
    {
      "id": 470,
      "floor": 4,
      "cluster": "stdm_top_wing",
      "side": "south",
      "left": 468,
      "right": 472
    },
    {
      "id": 472,
      "floor": 4,
      "cluster": "stdm_top_wing",
      "side": "south",
      "left": 470,
      "right": 474
    },
    {
      "id": 474,
      "floor": 4,
      "cluster": "stdm_top_wing",
      "side": "south",
      "left": 472,
      "right": 476
    },
    {
      "id": 476,
      "floor": 4,
      "cluster": "stdm_top_wing",
      "side": "south",
      "left": 474,
      "right": 478
    },
    {
      "id": 478,
      "floor": 4,
      "cluster": "stdm_top_wing",
      "side": "south",
      "left": 476,
      "right": 480
    },
    {
      "id": 480,
      "floor": 4,
      "cluster": "stdm_top_wing",
      "side": "south",
      "left": 478,
      "right": 482
    },
    {
      "id": 482,
      "floor": 4,
      "cluster": "stdm_top_wing",
      "side": "south",
      "left": 480,
      "right": 484
    },
    {
      "id": 484,
      "floor": 4,
      "cluster": "stdm_top_wing",
      "side": "south",
      "left": 482,
      "right": 486
    },
    {
      "id": 486,
      "floor": 4,
      "cluster": "stdm_top_wing",
      "side": "south",
      "left": 484,
      "right": null
    }
  ]
};