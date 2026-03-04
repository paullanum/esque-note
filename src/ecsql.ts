type Reference = `REFERENCE ${string}(${string})`
export type Data = "INTEGER" | "REAL" | "TEXT" | Reference;
type TypeMap = {
    INTEGER: number,
    REAL: number,
    TEXT: string,
    [key: Reference]: number
};

async function init_ecsql() {
    const { SQLocal } = await import("sqlocal");
    return new SQLocal({
        databasePath: "database.sqlite3",
        onInit: (sql) => { return [sql`PRAGMA foreign_keys = true`] },
    });
}

// TODO: This is a weird pattern, there's a better way to handle this
export let { sql, deleteDatabaseFile } = await init_ecsql()
export let table_exists = (await sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name='__entities'`).length > 0
if (!table_exists) {
    console.log("Creating table...")
    await sql`CREATE TABLE IF NOT EXISTS __entities (id INTEGER UNIQUE PRIMARY KEY AUTOINCREMENT)`
}

let entity_count: number = (await sql`SELECT COUNT(*) as count FROM __entities`)[0]["count"]

export async function createEntity() {
    await sql`INSERT INTO __entities(id) VALUES (${entity_count})`
    entity_count += 1;
    return entity_count - 1;
}

export type ComponentDataTypes = {
    [type_name: string]: Data
}

export type ComponentData<T extends ComponentDataTypes> = {
    [data_name in keyof T]: TypeMap[T[data_name]]
}

type DefaultSqLocalReturnType = Record<string, any>[];

export type Component<T extends ComponentDataTypes> = {
    init: (entity: number, data: Partial<ComponentData<T>>) => Promise<DefaultSqLocalReturnType>
    update: (entity: number, data: Partial<ComponentData<T>>) => Promise<DefaultSqLocalReturnType>
    component: string,
    data_types: T
}

export async function createComponent<T extends ComponentDataTypes>(component_name: string, data_types: T): Promise<Component<T>> {
    let data_input = ""
    let foreign_keys = ""
    let references: { [key: string]: string } = {}
    for (let name of Object.keys(data_types)) {
        let type = data_types[name]
        if (type.startsWith("REFERENCE")) {
            references[name] = type.slice(9)
            type = "INTEGER"
        }
        data_input += `${name} ${data_types[name]}, `
    }
    if (Object.keys(references).length != 0) {
        foreign_keys = ","
    }
    for (let ref of Object.keys(references)) {
        foreign_keys += `FOREIGN KEY(${ref} REFERENCES ${references[ref]}) ON DELETE CASCADE`
    }
    let input = `CREATE TABLE IF NOT EXISTS ${component_name} (
    entity INTEGER UNIQUE PRIMARY KEY,
    ${data_input}
    FOREIGN KEY(entity) REFERENCES __entities(id) ON DELETE CASCADE
    ${foreign_keys}
    )`
    await sql(input)

    return {
        init: async (entity: number, data: Partial<ComponentData<T>>) => {
            let keys = ""
            let values = ""
            for (let key of Object.keys(data)) {
                keys += "," + key
                let input: number | string = data[key]!;
                if (typeof data[key] === "string") {
                    input = "'" + input + "'"
                }
                values += "," + input
            }
            let input = `INSERT INTO ${component_name} (entity ${keys}) VALUES (${entity} ${values})`
            console.log("SET:", input)
            return await sql(input)
        },
        update: async (entity: number, data: Partial<ComponentData<T>>) => {
            let updates = ""
            for (let key of Object.keys(data)) {
                if (updates !== "") {
                    updates += "," + key
                }
                let input: number | string = data[key]!;
                if (typeof data[key] === "string") {
                    input = "'" + input + "'"
                }
                updates += `${key} = ${input}`;
            }
            let input = `UPDATE ${component_name} SET ${updates} WHERE entity = ${entity}`
            console.log("UPDATE:", input)
            return await sql(input)
        },
        component: component_name,
        data_types
    }
    // TODO: Get data for given entity
}

// TODO: Take the component objects instead of strings?
export async function query(...components: string[]) {
    let base = components[0]
    let joins = ""
    for (let component of components) {
        if (component == base) {
            continue
        }
        joins += `INNER JOIN ${component} ON ${base}.entity = ${component}.entity `
    }
    let statement = `SELECT * FROM ${components[0]} ${joins}`
    return await sql(statement)
}

export async function listComponents() {
    let components: { name: string }[] = await sql`SELECT name FROM sqlite_master WHERE type = 'table'`
    return components.filter(component => !component.name.startsWith("__") && component.name !== "sqlite_sequence");

}

export async function removeComponent(componentName: string) {
    return await sql`DROP TABLE ${componentName}`
}

export async function removeEntity(entityId: number) {
    await sql`DELETE FROM __entities WHERE id = ${entityId}`
}
