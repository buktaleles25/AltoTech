import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

export type Lang = 'th' | 'en'

const TH = {
  appName: 'ลายน้ำน่ารัก',
  tagline: 'ใส่ลายน้ำหลายรูปพร้อมกัน ในคลิกเดียว',
  privacy: 'ทำงานบนเครื่องคุณ 100% ไม่มีการอัปโหลดรูปขึ้นเซิร์ฟเวอร์',
  langLabel: 'EN',

  dropTitle: 'ลากรูปมาวาง หรือแตะเพื่อเลือก',
  dropHint: 'เลือกได้หลายรูปพร้อมกัน · รองรับ JPG, PNG, WebP',
  chooseImages: 'เลือกรูป',
  addMore: 'เพิ่มรูป',
  takePhoto: 'ถ่ายรูป',
  clearAll: 'ล้างทั้งหมด',
  emptyHint: 'ยังไม่มีรูปเลย~ อัปโหลดมาเริ่มกันเลย ✨',

  imagesCount: (n: number) => `รูปทั้งหมด ${n} รูป`,
  preview: 'ตัวอย่าง',
  previewHint: 'ปรับแล้วเห็นผลทันที (แสดงรูปแรกเป็นตัวอย่าง)',

  tabText: 'ข้อความ',
  tabLogo: 'โลโก้',
  tabLayout: 'ตำแหน่ง',
  tabOutput: 'ไฟล์',

  enable: 'เปิดใช้',
  textContent: 'ข้อความลายน้ำ',
  textPlaceholder: 'พิมพ์ข้อความ เช่น © ชื่อของคุณ',
  font: 'ฟอนต์',
  size: 'ขนาด',
  color: 'สี',
  opacity: 'ความโปร่งใส',
  outline: 'เส้นขอบตัวอักษร (อ่านง่ายขึ้น)',
  outlineColor: 'สีเส้นขอบ',

  uploadLogo: 'อัปโหลดโลโก้ (แนะนำ PNG พื้นหลังโปร่ง)',
  changeLogo: 'เปลี่ยนโลโก้',
  removeLogo: 'ลบโลโก้',
  logoSize: 'ขนาดโลโก้',
  logoOpacity: 'ความโปร่งใสโลโก้',
  logoNeeded: 'ยังไม่มีโลโก้ — แตะเพื่ออัปโหลด',

  position: 'ตำแหน่ง',
  tile: 'ปูทั้งรูป',
  rotation: 'หมุน',
  margin: 'ระยะขอบ',
  tileGap: 'ระยะห่าง (โหมดปู)',

  format: 'นามสกุลไฟล์',
  quality: 'คุณภาพ',
  maxSize: 'ขนาดสูงสุด (ด้านยาว)',
  original: 'ขนาดเดิม',
  prefix: 'คำนำหน้าชื่อไฟล์',
  prefixPlaceholder: 'เช่น wm_ (เว้นว่างได้)',

  applyAll: 'ใส่ลายน้ำทั้งหมด',
  reapply: 'ทำใหม่อีกครั้ง',
  processing: 'กำลังทำ...',
  cancel: 'ยกเลิก',
  progress: (a: number, b: number) => `${a} / ${b} รูป`,
  doneCount: (n: number) => `เสร็จแล้ว ${n} รูป 🎉`,

  shareToPhotos: 'แชร์เข้า Photos',
  downloadZip: 'ดาวน์โหลด ZIP',
  saveAll: 'บันทึกทั้งหมด',
  shareOne: 'แชร์',
  downloadOne: 'บันทึก',
  remove: 'ลบ',
  needProcess: 'กด "ใส่ลายน้ำทั้งหมด" ก่อนน้า~',

  iosHint: 'บน iPhone แตะ "แชร์เข้า Photos" แล้วเลือก Save Image เพื่อเซฟลงคลังรูป 💕',
  zipReady: 'ดาวน์โหลด ZIP แล้ว~ เปิดในแอป Files ได้เลย 🎀',
  shareCancelled: 'ยกเลิกการแชร์แล้ว',
  shareError: 'แชร์ไม่สำเร็จ ลองดาวน์โหลด ZIP แทนน้า',
  someErrors: (n: number) => `มี ${n} รูปที่ทำไม่สำเร็จ (อาจเป็นไฟล์ HEIC)`,
  resetSettings: 'รีเซ็ตค่า',
  madeWith: 'ทำด้วยใจ',
}

const EN: typeof TH = {
  appName: 'Cutie Watermark',
  tagline: 'Watermark many photos at once, in one tap',
  privacy: '100% on your device — no photos are ever uploaded',
  langLabel: 'ไทย',

  dropTitle: 'Drop photos here or tap to choose',
  dropHint: 'Pick many at once · JPG, PNG, WebP supported',
  chooseImages: 'Choose photos',
  addMore: 'Add more',
  takePhoto: 'Camera',
  clearAll: 'Clear all',
  emptyHint: 'No photos yet~ upload some to begin ✨',

  imagesCount: (n: number) => `${n} photo${n === 1 ? '' : 's'}`,
  preview: 'Preview',
  previewHint: 'Live preview (showing the first photo)',

  tabText: 'Text',
  tabLogo: 'Logo',
  tabLayout: 'Layout',
  tabOutput: 'File',

  enable: 'Enable',
  textContent: 'Watermark text',
  textPlaceholder: 'Type text, e.g. © Your Name',
  font: 'Font',
  size: 'Size',
  color: 'Color',
  opacity: 'Opacity',
  outline: 'Text outline (easier to read)',
  outlineColor: 'Outline color',

  uploadLogo: 'Upload logo (PNG with transparency recommended)',
  changeLogo: 'Change logo',
  removeLogo: 'Remove logo',
  logoSize: 'Logo size',
  logoOpacity: 'Logo opacity',
  logoNeeded: 'No logo yet — tap to upload',

  position: 'Position',
  tile: 'Tile',
  rotation: 'Rotate',
  margin: 'Margin',
  tileGap: 'Gap (tile mode)',

  format: 'Format',
  quality: 'Quality',
  maxSize: 'Max size (longest edge)',
  original: 'Original',
  prefix: 'Filename prefix',
  prefixPlaceholder: 'e.g. wm_ (optional)',

  applyAll: 'Watermark all',
  reapply: 'Apply again',
  processing: 'Working...',
  cancel: 'Cancel',
  progress: (a: number, b: number) => `${a} / ${b}`,
  doneCount: (n: number) => `${n} done 🎉`,

  shareToPhotos: 'Share to Photos',
  downloadZip: 'Download ZIP',
  saveAll: 'Save all',
  shareOne: 'Share',
  downloadOne: 'Save',
  remove: 'Remove',
  needProcess: 'Tap "Watermark all" first~',

  iosHint: 'On iPhone, tap "Share to Photos" then Save Image to add them to your camera roll 💕',
  zipReady: 'ZIP downloaded~ open it in the Files app 🎀',
  shareCancelled: 'Share cancelled',
  shareError: 'Share failed — try Download ZIP instead',
  someErrors: (n: number) => `${n} photo(s) failed (possibly HEIC files)`,
  resetSettings: 'Reset',
  madeWith: 'made with love',
}

export type Strings = typeof TH

const DICT: Record<Lang, Strings> = { th: TH, en: EN }

interface I18nContextValue {
  lang: Lang
  setLang: (l: Lang) => void
  toggle: () => void
  t: Strings
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('wm-lang') : null
    return saved === 'en' ? 'en' : 'th'
  })

  const value = useMemo<I18nContextValue>(() => {
    const setLang = (l: Lang) => {
      try {
        localStorage.setItem('wm-lang', l)
      } catch {
        // ignore
      }
      setLangState(l)
    }
    return {
      lang,
      setLang,
      toggle: () => setLang(lang === 'th' ? 'en' : 'th'),
      t: DICT[lang],
    }
  }, [lang])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
