echo "Running migrations ..."
for i in $(seq 1 30); do
    knex migrate:latest
    [ $? = 0 ] && break
    echo "Reconnecting db ..." && sleep 1
done
