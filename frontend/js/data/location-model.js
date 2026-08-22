/** Contratos conceptuales compartidos por los casos de pérdida y hallazgo. */
export const locationSchema={required:["countryCode","departmentId","municipalityId","placeDescription"],countryCode:"CO"};
export const occurredAtSchema={required:["date","time","approximateTime"],timeNullable:true};

export function validateCaseLocation(location,occurredAt,{departments,municipalities,today=(()=>{const date=new Date(),pad=value=>String(value).padStart(2,"0");return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`})()}){
  const department=departments.find(item=>item.id===location.departmentId);
  const municipality=municipalities.find(item=>item.id===location.municipalityId);
  if(!department)throw new Error("Departamento inexistente: "+location.departmentId);
  if(!municipality)throw new Error("Municipio inexistente: "+location.municipalityId);
  if(municipality.departmentId!==department.id)throw new Error("Municipio y departamento incompatibles");
  if(occurredAt.date>today)throw new Error("La fecha del evento no puede estar en el futuro");
  if(occurredAt.time==="00:00"&&occurredAt.approximateTime===null)throw new Error("La hora desconocida debe guardarse como null");
  return true;
}
