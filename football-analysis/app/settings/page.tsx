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
            <span className="font-medium text-text-primary">1. ดึงราคาน้ำจริง</span> — จากเจ้ามือหลายราย
            แปลงเป็นความน่าจะเป็นโดยนัย (implied probability) และตัดค่าคอมมิชชั่นของเจ้ามือ (de-vig) ออก
          </li>
          <li>
            <span className="font-medium text-text-primary">2. ประเมินด้วยข้อมูลจริง</span> — ฟอร์มล่าสุด, สถิติเหย้า/เยือน,
            ผลเจอกันในอดีต, ไลน์อัพและผู้เล่นบาดเจ็บ ผสมกับราคาตลาดเป็นฐาน (ตลาดแม่นกว่าโมเดลง่าย ๆ ของเรา
            เราจึงปรับจากราคาตลาดแทนที่จะทำนายเองทั้งหมด)
          </li>
          <li>
            <span className="font-medium text-text-primary">3. หาคุณค่า (Value)</span> — เทียบความน่าจะเป็นของระบบกับราคาตลาด
            คู่ไหนที่ต่างกันมากพอและมั่นใจได้ ถือว่ามี &ldquo;คุณค่า&rdquo;
          </li>
          <li>
            <span className="font-medium text-text-primary">4. ติดตามการขยับราคา</span> — เปรียบเทียบราคาเปิดกับราคาล่าสุด
            เพื่อดูว่ามีเงินก้อนใหญ่/ข่าววงในเข้ามาขยับตลาดหรือไม่ (steam move)
          </li>
          <li>
            <span className="font-medium text-text-primary">5. สรุปเป็น Step</span> — เลือกสูงสุด 5 คู่ที่มีคุณค่าสูงสุดจากคนละแมตช์กัน
            ที่เตะวันเดียวกันเท่านั้น (จบพร้อมกันทั้งชุด) ต้องมีอย่างน้อย 3 คู่ที่ผ่านเกณฑ์จริงถึงจะส่ง Step วันนั้น —
            ถ้าไม่ถึง 3 คู่ ระบบจะไม่ปั้นคู่มาเติมให้ครบ
          </li>
        </ol>
      </section>

      <section className="mt-4 rounded-2xl border border-border-subtle bg-surface p-4">
        <h2 className="text-sm font-semibold text-text-primary">แหล่งข้อมูล</h2>
        <ul className="mt-2 flex flex-col gap-1 text-xs text-text-secondary">
          <li>• ราคาน้ำ: The Odds API (free tier)</li>
          <li>• ตารางแข่ง / ไลน์อัพ / อาการบาดเจ็บ: API-Football (RapidAPI free tier)</li>
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

      <p className="mt-4 text-center text-[11px] text-text-muted">Step 5 · เวอร์ชันสาธิต · ข้อมูลเพื่อการวิเคราะห์เท่านั้น</p>
    </div>
  );
}
