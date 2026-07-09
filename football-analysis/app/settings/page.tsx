import PushToggle from "@/components/PushToggle";

export default function SettingsPage() {
  return (
    <div className="flex flex-1 flex-col px-4 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-6">
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-text-primary">ตั้งค่า / เกี่ยวกับ</h1>
      </header>

      <section className="flex flex-col gap-3">
        <PushToggle />
      </section>

      <section className="mt-6 rounded-2xl border border-border-subtle bg-surface p-4">
        <h2 className="text-sm font-semibold text-text-primary">ระบบทำงานอย่างไร</h2>
        <ol className="mt-2 flex flex-col gap-2 text-xs leading-relaxed text-text-secondary">
          <li>
            <span className="font-medium text-text-primary">1. อ่านราคาน้ำจริง</span> — ดึงราคา 1X2, ราคาต่อรอง (แฮนดิแคป)
            และสูง/ต่ำ จากเจ้ามือหลายราย ตัดค่าน้ำ (de-vig) ออกเพื่อหาโอกาสจริงที่ตลาดให้
          </li>
          <li>
            <span className="font-medium text-text-primary">2. สร้างโมเดลจำนวนประตู</span> — จากราคาตลาด (โดยเฉพาะเจ้ามือเก่ง
            อย่าง Pinnacle) ถอดออกมาเป็น &ldquo;จำนวนประตูคาดหวัง&rdquo; ของแต่ละทีมด้วยโมเดล Poisson/Dixon-Coles
            แล้วปรับด้วยฟอร์มบอลได้-เสียฤดูกาลปัจจุบัน (จาก football-data.org) เล็กน้อย
          </li>
          <li>
            <span className="font-medium text-text-primary">3. ตีราคาทุกตลาด</span> — จากโมเดลเดียวนี้ คำนวณโอกาสของทุกเส้น
            แฮนดิแคป ทุกเส้นสูง/ต่ำ และ 1X2 แล้วเทียบกับราคาที่เจ้ามือเปิด
          </li>
          <li>
            <span className="font-medium text-text-primary">4. หา value + เทียบราคาข้ามเจ้า</span> — เลือกเฉพาะบิลที่ราคาน้ำ
            &ldquo;คุ้มกว่าที่ควรจะเป็น&rdquo; (EV เป็นบวก) และเลือกเจ้าที่ให้ราคาดีที่สุดสำหรับเส้นนั้นให้
          </li>
        </ol>
      </section>

      <section className="mt-4 rounded-2xl border border-info/30 bg-info/10 p-4">
        <h2 className="text-sm font-semibold text-info">ตรงไปตรงมาเรื่องความแม่น</h2>
        <p className="mt-2 text-xs leading-relaxed text-text-secondary">
          โมเดลนี้ <strong className="text-text-primary">อิงราคาตลาดของเจ้ามือเก่งเป็นฐาน</strong> ไม่ใช่สูตรลับที่ชนะทุกครั้ง
          — ไม่มีระบบไหนในโลกที่ &ldquo;แม่นกว่าทุกสำนัก&rdquo; หรือการันตีกำไรได้จริง. value ที่ระบบหาเจอมาจาก
          การเทียบราคาข้ามเจ้ามือเพื่อได้ราคาน้ำที่ดีที่สุด บวกกับจุดที่โมเดลเราต่างจากตลาด. เล่นอย่างมีสติและบริหารเงินเสมอ
        </p>
      </section>

      <section className="mt-4 rounded-2xl border border-border-subtle bg-surface p-4">
        <h2 className="text-sm font-semibold text-text-primary">แหล่งข้อมูล</h2>
        <ul className="mt-2 flex flex-col gap-1 text-xs text-text-secondary">
          <li>• ราคาน้ำ (1X2 / แฮนดิแคป / สูง-ต่ำ): The Odds API</li>
          <li>• สถิติบอลได้-เสียฤดูกาลปัจจุบัน: football-data.org</li>
          <li>• ข่าว: BBC Sport, ESPN FC, Sky Sports (RSS ฟรี)</li>
        </ul>
      </section>

      <section className="mt-4 rounded-2xl border border-warning/30 bg-warning-soft p-4">
        <h2 className="text-sm font-semibold text-warning">คำเตือนเรื่องการพนัน</h2>
        <p className="mt-2 text-xs leading-relaxed text-text-secondary">
          แอปนี้เป็นเครื่องมือวิเคราะห์และให้ข้อมูลเชิงสถิติเท่านั้น <strong className="text-text-primary">ไม่ใช่คำแนะนำการพนัน
          และไม่มีการรับวางเดิมพันหรือประมวลผลธุรกรรมทางการเงินใด ๆ ในระบบ</strong> ผลการวิเคราะห์ในอดีตไม่ได้เป็น
          เครื่องยืนยันผลลัพธ์ในอนาคต การพนันมีความเสี่ยงต่อทรัพย์สิน ผู้ใช้ต้องมีอายุ 18 ปีขึ้นไป และต้องปฏิบัติตาม
          กฎหมายว่าด้วยการพนันในเขตอำนาจของตน หากท่านหรือคนใกล้ตัวมีปัญหาเกี่ยวกับการพนัน โปรดขอความช่วยเหลือจาก
          หน่วยงานที่เกี่ยวข้องในพื้นที่ของท่าน
        </p>
      </section>

      <p className="mt-4 text-center text-[11px] text-text-muted">Step 5 · ข้อมูลเพื่อการวิเคราะห์เท่านั้น</p>
    </div>
  );
}
