// 文言。遊び中の一言は12字前後
export const TXT = {
  ja: {
    title: '小人になっておかんと戦え', logo1: '小人になって', logo2: 'おかんと戦え',
    story: '賞味期限2019年のヨーグルトで体が2cmに。元に戻る新品のヨーグルトは、おかんのエプロンのポケットの中。',
    start: 'たたかう', how: '遊び方', lang: 'English', again: 'もう一回', save: '画像を保存', post: 'Xでポスト', toTitle: 'タイトルへ', loading: '爪楊枝を削っています',
    howTitle: '冷蔵庫のメモ',
    howList: ['爪楊枝は勝手に飛ぶ。左右に動いて、跳んで、かわす', 'ダッシュの間は当たらない', 'ピンクの物は、空中でもう一回タップで弾き返せる', '床で近くにいると小指に刺さって1.5倍。高く跳ぶと顔に刺さって2倍', '予備動作を見る。赤い輪は落ちてくる場所'],
    ok: 'わかった', paused: 'ちょっと休憩', resume: 'つづける', quit: 'やめる', credit: '効果音の一部 CC BY: Werstas、Gravity Sound。詳しくは CREDITS.md',
    hintJump: '画びょうは跳ぶ', hintDash: 'ダッシュ中は当たらない', hintParry: '空中でもう一回タップ', hintMove: '右へ走る',
    sOkan: 'おかん', sDad: 'おとん',
    say: {
      intro: ['ヨーグルト返し！', 'ちっさい泥棒や！'], retry: ['また来たんか', 'しつこいで！', '賞味期限切れや！'],
      toss: ['ほれ！', 'スリッパいくで！', '当たったら痛いで！'], skate: ['おとんのサンダルや！'], suck: ['掃除の時間や！', '吸うたるで！'], sweep: ['そこどき！'],
      callCat: ['もしもし、猫ちゃん？'], longCall: ['ほんでな、あの奥さんがな'], stomp: ['どすこい！'],
      toe: ['小指はアカン！', 'タンスより痛い！'], parry: ['返すな！', '行儀悪い！'], ph2: ['痛いな！誰や！'], ph3: ['もう怒ったで！！'], hurt: ['当たったで！', '一発やで！'],
      dad: ['腹へった'], roomba: ['目が合った'], win: ['腰が…腰が…'], lose: ['ゴミと一緒やで！', '片付けとくわ']
    },
    paper: {
      head: '通 知 表', sub: '2cmの部　小人どの', teacher: '担任　おかん',
      shots: '当たった爪楊枝', toe: '足の小指', face: '顔', parry: '弾いたもの', hp: '残りの絆創膏', time: '戦った時間', unit: '本', unitP: '回', unitH: '枚', sec: '秒',
      left: 'あと', notes: '所見',
      S: ['大変よくできました', '小指が今も痛いです。ヨーグルトは3割引のやつです。'], A: ['よくできました', 'エプロンが爪楊枝だらけです。洗濯が大変です。'], B: ['もう少しがんばりましょう', '勝ったからって調子に乗らないこと。部屋も片付けなさい。'], C: ['がんばりました', 'ギリギリでした。夕飯までに元の大きさに戻りなさい。'],
      close: ['おしいで賞', 'おかんの腰はもう限界でした。あと少しです。'], try: ['がんばりましょう', 'スリッパをよく見なさい。話はそれからです。'], more: ['ちゃんと聞きなさい', '赤い輪から離れなさい。あと爪楊枝は戻しなさい。'],
      by: { slip: 'スリッパ', sandal: 'おとんのサンダル', dust: '綿ぼこり', vac: '掃除機', cat: '猫', stomp: 'どすこい', tack: '画びょう', roomba: 'ルンバ' }, byLabel: 'やられた物'
    },
    postWin: (g, t) => `おかんに勝った。通知表は「${g}」、${t}秒。 #小人になっておかんと戦え #バカゲー`,
    postLose: p => `おかんを倒すまで、あと${p}%だった。 #小人になっておかんと戦え #バカゲー`
  },
  en: {
    title: 'Tiny vs Mom', logo1: 'TINY', logo2: 'VS MOM',
    story: 'Expired yogurt shrank you to 2 cm. The fresh yogurt that turns you back is in Mom\'s apron pocket.',
    start: 'FIGHT', how: 'How to play', lang: '日本語', again: 'Again', save: 'Save image', post: 'Post on X', toTitle: 'Title', loading: 'Sharpening toothpicks',
    howTitle: 'Note on the fridge',
    howList: ['Toothpicks fire by themselves. Move and jump to dodge', 'You can\'t be hit while dashing', 'Tap again in the air to knock pink things back', 'Close on the floor: toe hits x1.5. High up: face hits x2', 'Watch her wind-up. A red ring marks where it lands'],
    ok: 'Got it', paused: 'Break time', resume: 'Resume', quit: 'Quit', credit: 'Some sounds CC BY: Werstas, Gravity Sound. See CREDITS.md',
    hintJump: 'Jump the thumbtacks', hintDash: 'Dashing dodges hits', hintParry: 'Tap again in the air', hintMove: 'Run right',
    sOkan: 'Mom', sDad: 'Dad',
    say: {
      intro: ['Give back my yogurt!', 'A tiny thief!'], retry: ['You again?', 'So persistent!', 'You\'re expired!'],
      toss: ['Here!', 'Slipper time!', 'This one stings!'], skate: ['Your dad\'s sandal!'], suck: ['Cleaning time!', 'Into the bag!'], sweep: ['Out of the way!'],
      callCat: ['Hello, kitty?'], longCall: ['And then that lady said...'], stomp: ['HUP!'],
      toe: ['Not the pinky toe!', 'Worse than furniture!'], parry: ['Don\'t throw it back!', 'Bad manners!'], ph2: ['Ouch! Who did that?'], ph3: ['NOW I\'M MAD!!'], hurt: ['Got you!', 'One hit!'],
      dad: ['I\'m hungry'], roomba: ['It saw me'], win: ['My back...'], lose: ['Off with the trash!', 'Tidied up']
    },
    paper: {
      head: 'REPORT CARD', sub: '2 cm class: Tiny', teacher: 'Teacher: Mom',
      shots: 'Toothpicks landed', toe: 'Pinky toe', face: 'Face', parry: 'Knocked back', hp: 'Bandages left', time: 'Fight time', unit: '', unitP: '', unitH: '', sec: ' s',
      left: 'left', notes: 'Comments',
      S: ['Excellent', 'My toe still hurts. The yogurt was 30% off.'], A: ['Well done', 'My apron is full of toothpicks. Laundry day.'], B: ['Try harder', 'Winning is no excuse. Clean your room.'], C: ['You tried', 'That was close. Be full size by dinner.'],
      close: ['So close', 'Mom\'s back was about to give out.'], try: ['Keep trying', 'Watch the slippers. Then we\'ll talk.'], more: ['Pay attention', 'Stay out of the red ring. And return those toothpicks.'],
      by: { slip: 'Slipper', sandal: 'Dad\'s sandal', dust: 'Dust bunny', vac: 'Vacuum', cat: 'Cat', stomp: 'Stomp', tack: 'Thumbtack', roomba: 'Robot vacuum' }, byLabel: 'Beaten by'
    },
    postWin: (g, t) => `I beat Mom. Report card: "${g}", ${t} s. #TinyVsMom`,
    postLose: p => `Only ${p}% left to beat Mom. #TinyVsMom`
  }
}
