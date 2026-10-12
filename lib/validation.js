export class ValidationError extends Error { constructor(errors){super('Periksa kembali kolom yang ditandai.');this.errors=errors;} }
export function text(value){return typeof value==='string'?value.trim():'';}
export function length(errors,key,value,min,max,label){if(value.length<min||value.length>max)errors[key]=`${label} harus ${min}–${max} karakter.`;}
export function slugify(value){return value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'item';}
export function normalizePhone(value){let p=text(value).replace(/[\s()+.-]/g,'');if(p.startsWith('0'))p='62'+p.slice(1);return /^62[1-9]\d{7,13}$/.test(p)?p:null;}
export function validHttps(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}}
export function productInput(body,existing,categoryExists,imageId){
  const errors={},name=text(body.name),description=text(body.description),status=body.publication_status||'draft';
  length(errors,'name',name,3,150,'Nama barang');
  if(!['draft','published'].includes(status))errors.publication_status='Status publikasi tidak valid.';
  const price=text(String(body.price_idr??''));const amount=price===''?null:Number(price);
  if(price!==''&&(!/^\d+$/.test(price)||!Number.isSafeInteger(amount)||amount<=0||amount>999999999999))errors.price_idr='Harga harus bilangan bulat 1–999.999.999.999.';
  const category=body.category_id?Number(body.category_id):null;
  if(category!==null&&(!Number.isInteger(category)||!categoryExists(category)))errors.category_id='Kategori tidak ditemukan.';
  const availability=body.availability||'available';
  if(!['available','unavailable'].includes(availability))errors.availability='Pilih Tersedia atau Habis.';
  if(description.length>5000)errors.description='Deskripsi maksimal 5.000 karakter.';
  if(status==='published'){
    if(amount===null)errors.price_idr='Harga wajib sebelum terbit.';
    length(errors,'description',description,10,5000,'Deskripsi');
    if(!category)errors.category_id='Kategori wajib sebelum terbit.';
    if(!imageId)errors.image='Foto utama wajib sebelum terbit.';
  }
  if(Object.keys(errors).length)throw new ValidationError(errors);
  return {name,description,price_idr:amount,category_id:category,availability,publication_status:status};
}
