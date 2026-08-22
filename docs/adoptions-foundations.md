# Adopciones y Fundaciones

## Fuente de verdad

Adopciones no mantiene animales paralelos. Consulta `FoundationAnimal` y publica únicamente registros con `adoptionStatus === "available"`. Perdidos y encontrados permanecen en el conjunto comunitario porque representan casos distintos.

La URL canónica es `#/animales/:slug`. `#/fundaciones/animal/:slug` existe solo como redirección compatible.

## Solicitud futura

`AdoptionApplication` relaciona una cuenta USER, un animal y la fundación que lo cuida. Estados previstos: `submitted`, `underReview`, `interview`, `approved`, `rejected`, `withdrawn`. El arreglo demo está vacío.

Antes de aceptar datos, el backend deberá comprobar existencia del animal y de la fundación, coherencia entre ambos, estado adoptable, autorización, duplicados y transición válida de estado.

## Experiencia demo

El botón Adoptar abre una explicación de cuatro pasos: conocer el perfil, enviar solicitud, evaluación responsable, decisión y seguimiento. No crea registros, no guarda respuestas y no contacta a nadie.

## Integridad

La carga valida IDs y slugs duplicados, referencias de animales a fundaciones, relaciones inversas, solicitudes con animal o fundación inexistentes o incoherentes, estados inválidos y apadrinamientos inconsistentes.

## Separación conceptual

Adoptar evalúa un posible cambio de hogar. Apadrinar apoya al individuo mientras sigue bajo responsabilidad de la fundación; no concede propiedad ni implica pagos en esta demo.
