type CacheItems<T> = {
    [name: string]: {
        valid: boolean,
        data: T
    }
}
let cachedItems: CacheItems<any> = {}

export async function getCached<T>(name: string, getter: () => Promise<T>) {
    if (Object.hasOwn(cachedItems, name)) {
        let { valid, data } = cachedItems[name];
        if (valid) {
            return data as T;
        } else {
            cachedItems[name].data = await getter();
            cachedItems[name].valid = true;
            return cachedItems[name].data as T;
        }
    }
    cachedItems[name] = {
        valid: true,
        data: await getter()
    };
    return cachedItems[name].data as T;
}

export function invalidateFromFunction(predicate: (key: string) => boolean) {
    Object.keys(cachedItems).filter(predicate).forEach((name) => {
        cachedItems[name].valid = false;
    })
}
